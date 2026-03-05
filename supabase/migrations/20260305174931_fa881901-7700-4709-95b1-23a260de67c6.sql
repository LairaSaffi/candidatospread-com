
-- Drop all existing policies on job_evaluation_links
DROP POLICY IF EXISTS "Donos e admins podem ver links de avaliação" ON public.job_evaluation_links;
DROP POLICY IF EXISTS "Gestão e admins podem criar links de avaliação" ON public.job_evaluation_links;

-- Recreate as PERMISSIVE (explicit) with gestao_operacao on SELECT too
CREATE POLICY "Autenticados podem ver links de avaliação"
ON public.job_evaluation_links FOR SELECT TO authenticated
USING (is_job_owner(job_id) OR is_admin() OR has_role(auth.uid(), 'gestao_operacao'));

CREATE POLICY "Gestão e admins podem criar links de avaliação"
ON public.job_evaluation_links FOR INSERT TO authenticated
WITH CHECK (is_job_owner(job_id) OR is_admin() OR has_role(auth.uid(), 'gestao_operacao'));

-- Fix talent_share_links - drop restrictive and recreate permissive
DROP POLICY IF EXISTS "Authenticated users can view talent share links" ON public.talent_share_links;
DROP POLICY IF EXISTS "Authenticated users can create talent share links" ON public.talent_share_links;

CREATE POLICY "Autenticados podem ver talent share links"
ON public.talent_share_links FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Autenticados podem criar talent share links"
ON public.talent_share_links FOR INSERT TO authenticated
WITH CHECK (true);

-- Fix talent_share_candidates
DROP POLICY IF EXISTS "Authenticated users can view talent share candidates" ON public.talent_share_candidates;
DROP POLICY IF EXISTS "Authenticated users can insert talent share candidates" ON public.talent_share_candidates;

CREATE POLICY "Autenticados podem ver talent share candidates"
ON public.talent_share_candidates FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Autenticados podem criar talent share candidates"
ON public.talent_share_candidates FOR INSERT TO authenticated
WITH CHECK (true);

-- Fix candidate_share_links
DROP POLICY IF EXISTS "Authenticated users can view share links" ON public.candidate_share_links;
DROP POLICY IF EXISTS "Admins, owners and gestao can create share links" ON public.candidate_share_links;
DROP POLICY IF EXISTS "Admins can delete share links" ON public.candidate_share_links;

CREATE POLICY "Autenticados podem ver share links"
ON public.candidate_share_links FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Gestão owners e admins podem criar share links"
ON public.candidate_share_links FOR INSERT TO authenticated
WITH CHECK (
  is_admin() OR 
  has_role(auth.uid(), 'gestao_operacao') OR
  (EXISTS (
    SELECT 1 FROM candidates c JOIN jobs j ON j.id = c.job_id
    WHERE c.id = candidate_share_links.candidate_id AND j.created_by = auth.uid()
  ))
);

CREATE POLICY "Admins podem deletar share links"
ON public.candidate_share_links FOR DELETE TO authenticated
USING (is_admin());
