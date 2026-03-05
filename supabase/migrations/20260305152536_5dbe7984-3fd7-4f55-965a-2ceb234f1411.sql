-- Fix job_evaluation_links policies: change from RESTRICTIVE to PERMISSIVE
DROP POLICY IF EXISTS "Donos e admins podem ver links de avaliação" ON public.job_evaluation_links;
DROP POLICY IF EXISTS "Usuários autenticados podem criar links de avaliação" ON public.job_evaluation_links;

CREATE POLICY "Donos e admins podem ver links de avaliação"
ON public.job_evaluation_links FOR SELECT TO authenticated
USING (is_job_owner(job_id) OR is_admin());

CREATE POLICY "Gestão e admins podem criar links de avaliação"
ON public.job_evaluation_links FOR INSERT TO authenticated
WITH CHECK (is_job_owner(job_id) OR is_admin() OR has_role(auth.uid(), 'gestao_operacao'));

-- Fix candidate_share_links policies: change from RESTRICTIVE to PERMISSIVE
DROP POLICY IF EXISTS "Authenticated users can view share links" ON public.candidate_share_links;
DROP POLICY IF EXISTS "Admins and job owners can create share links" ON public.candidate_share_links;
DROP POLICY IF EXISTS "Admins can delete share links" ON public.candidate_share_links;

CREATE POLICY "Authenticated users can view share links"
ON public.candidate_share_links FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins, owners and gestao can create share links"
ON public.candidate_share_links FOR INSERT TO authenticated
WITH CHECK (
  is_admin() OR 
  has_role(auth.uid(), 'gestao_operacao') OR
  (EXISTS (
    SELECT 1 FROM candidates c JOIN jobs j ON j.id = c.job_id
    WHERE c.id = candidate_share_links.candidate_id AND j.created_by = auth.uid()
  ))
);

CREATE POLICY "Admins can delete share links"
ON public.candidate_share_links FOR DELETE TO authenticated
USING (is_admin());

-- Fix talent_share_links policies: change from RESTRICTIVE to PERMISSIVE
DROP POLICY IF EXISTS "Authenticated users can view talent share links" ON public.talent_share_links;
DROP POLICY IF EXISTS "Authenticated users can create talent share links" ON public.talent_share_links;

CREATE POLICY "Authenticated users can view talent share links"
ON public.talent_share_links FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create talent share links"
ON public.talent_share_links FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Fix talent_share_candidates policies: change from RESTRICTIVE to PERMISSIVE
DROP POLICY IF EXISTS "Authenticated users can view talent share candidates" ON public.talent_share_candidates;
DROP POLICY IF EXISTS "Authenticated users can insert talent share candidates" ON public.talent_share_candidates;

CREATE POLICY "Authenticated users can view talent share candidates"
ON public.talent_share_candidates FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert talent share candidates"
ON public.talent_share_candidates FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);