-- Enum para papéis
CREATE TYPE public.app_role AS ENUM ('admin', 'comercial', 'gestao_operacao');

-- Tabela de perfis
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Tabela de papéis
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Função para verificar papel do usuário
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Função para obter papéis do usuário atual
CREATE OR REPLACE FUNCTION public.get_my_roles()
RETURNS app_role[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(role), ARRAY[]::app_role[])
  FROM public.user_roles
  WHERE user_id = auth.uid()
$$;

-- Função para verificar se é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

-- RLS para profiles
CREATE POLICY "Usuários podem ver seu próprio perfil"
ON public.profiles FOR SELECT
TO authenticated
USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "Admins podem criar perfis"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins podem atualizar perfis"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.is_admin());

-- RLS para user_roles
CREATE POLICY "Usuários podem ver seus próprios papéis"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Admins podem gerenciar papéis"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins podem deletar papéis"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.is_admin());

-- Grant permissões
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_roles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Trigger para atualizar updated_at em profiles
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Atualizar jobs.created_by para referenciar profiles e atualizar RLS
-- Política de SELECT em jobs - baseada em papel
DROP POLICY IF EXISTS "Qualquer um pode ver vagas com link de avaliação" ON public.jobs;
CREATE POLICY "Usuários autenticados podem ver vagas"
ON public.jobs FOR SELECT
TO authenticated
USING (true);

-- Manter política para avaliadores externos
CREATE POLICY "Avaliadores podem ver vagas via link"
ON public.jobs FOR SELECT
TO anon
USING (EXISTS (SELECT 1 FROM job_evaluation_links WHERE job_id = jobs.id));

-- Política de INSERT em jobs - apenas gestao_operacao ou admin
DROP POLICY IF EXISTS "Usuários autenticados podem criar vagas" ON public.jobs;
CREATE POLICY "Gestão pode criar vagas"
ON public.jobs FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'gestao_operacao') OR public.is_admin()
);

-- Política de UPDATE em jobs - apenas gestao_operacao ou admin (e dono)
DROP POLICY IF EXISTS "Donos podem atualizar suas vagas" ON public.jobs;
CREATE POLICY "Gestão pode atualizar vagas"
ON public.jobs FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'gestao_operacao') OR public.is_admin()
);