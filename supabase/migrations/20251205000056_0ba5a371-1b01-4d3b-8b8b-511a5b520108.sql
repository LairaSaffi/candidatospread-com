-- Função para verificar se o usuário é dono da vaga
CREATE OR REPLACE FUNCTION public.is_job_owner(p_job_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.jobs
    WHERE id = p_job_id
      AND created_by = auth.uid()
  );
$$;

-- Função para verificar se o usuário é dono do candidato (via vaga)
CREATE OR REPLACE FUNCTION public.is_candidate_owner(p_candidate_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.candidates c
    JOIN public.jobs j ON j.id = c.job_id
    WHERE c.id = p_candidate_id
      AND j.created_by = auth.uid()
  );
$$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION public.is_job_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_candidate_owner(uuid) TO authenticated;

-- Atualizar política de UPDATE em jobs
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar vagas" ON public.jobs;
CREATE POLICY "Donos podem atualizar suas vagas"
ON public.jobs
FOR UPDATE
TO authenticated
USING (created_by = auth.uid());

-- Atualizar política de UPDATE em candidates  
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar candidatos" ON public.candidates;
CREATE POLICY "Donos podem atualizar candidatos de suas vagas"
ON public.candidates
FOR UPDATE
TO authenticated
USING (is_job_owner(job_id));

-- Atualizar política de INSERT em candidates
DROP POLICY IF EXISTS "Usuários autenticados podem criar candidatos" ON public.candidates;
CREATE POLICY "Donos podem criar candidatos em suas vagas"
ON public.candidates
FOR INSERT
TO authenticated
WITH CHECK (is_job_owner(job_id));