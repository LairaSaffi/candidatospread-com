
-- Update candidate_tags INSERT policy to allow admins
DROP POLICY IF EXISTS "Job owners can manage candidate tags" ON public.candidate_tags;
CREATE POLICY "Job owners and admins can manage candidate tags"
ON public.candidate_tags FOR INSERT
WITH CHECK (is_candidate_owner(candidate_id) OR is_admin());

-- Update candidate_tags DELETE policy to allow admins
DROP POLICY IF EXISTS "Job owners can delete candidate tags" ON public.candidate_tags;
CREATE POLICY "Job owners and admins can delete candidate tags"
ON public.candidate_tags FOR DELETE
USING (is_candidate_owner(candidate_id) OR is_admin());

-- Also update candidates UPDATE policy to allow admins
DROP POLICY IF EXISTS "Donos podem atualizar candidatos de suas vagas" ON public.candidates;
CREATE POLICY "Donos e admins podem atualizar candidatos"
ON public.candidates FOR UPDATE
USING (is_job_owner(job_id) OR is_admin());
