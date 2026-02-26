
-- Add seniority to candidates
ALTER TABLE public.candidates ADD COLUMN seniority text;

-- Create tags table (admin-managed)
CREATE TABLE public.tags (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view tags" ON public.tags FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage tags" ON public.tags FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update tags" ON public.tags FOR UPDATE USING (is_admin());
CREATE POLICY "Admins can delete tags" ON public.tags FOR DELETE USING (is_admin());

-- Create candidate_tags junction table
CREATE TABLE public.candidate_tags (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(candidate_id, tag_id)
);

ALTER TABLE public.candidate_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view candidate_tags" ON public.candidate_tags FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Job owners can manage candidate tags" ON public.candidate_tags FOR INSERT WITH CHECK (is_candidate_owner(candidate_id));
CREATE POLICY "Job owners can delete candidate tags" ON public.candidate_tags FOR DELETE USING (is_candidate_owner(candidate_id));

-- Also allow unauthenticated users to see candidate_tags via evaluation links
CREATE POLICY "Evaluation link viewers can see candidate tags" ON public.candidate_tags FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM candidates c
    JOIN job_evaluation_links jel ON jel.job_id = c.job_id
    WHERE c.id = candidate_tags.candidate_id
  )
);
