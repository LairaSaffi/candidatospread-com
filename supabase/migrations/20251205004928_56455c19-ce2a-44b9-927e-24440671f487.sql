-- 1. Corrigir política da tabela profiles - exigir autenticação
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON public.profiles;

CREATE POLICY "Usuários autenticados podem ver perfis autorizados" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND (id = auth.uid() OR is_admin()));

-- 2. Restringir visualização de tokens de avaliação apenas para donos/admins
DROP POLICY IF EXISTS "Usuários autenticados podem ver links de avaliação" ON public.job_evaluation_links;

CREATE POLICY "Donos e admins podem ver links de avaliação" 
ON public.job_evaluation_links 
FOR SELECT 
USING (is_job_owner(job_id) OR is_admin());