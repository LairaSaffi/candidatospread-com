
-- Table for candidate share links
CREATE TABLE public.candidate_share_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  share_token uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(share_token)
);

-- Enable RLS
ALTER TABLE public.candidate_share_links ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view share links
CREATE POLICY "Authenticated users can view share links"
ON public.candidate_share_links FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Admins and job owners can create share links
CREATE POLICY "Admins and job owners can create share links"
ON public.candidate_share_links FOR INSERT
WITH CHECK (is_admin() OR EXISTS (
  SELECT 1 FROM candidates c JOIN jobs j ON j.id = c.job_id
  WHERE c.id = candidate_id AND j.created_by = auth.uid()
));

-- Admins can delete share links
CREATE POLICY "Admins can delete share links"
ON public.candidate_share_links FOR DELETE
USING (is_admin());

-- Function to get candidate data by share token (public access)
CREATE OR REPLACE FUNCTION public.get_candidate_by_share_token(p_token uuid)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_candidate_id uuid;
  v_result json;
BEGIN
  SELECT candidate_id INTO v_candidate_id
  FROM public.candidate_share_links
  WHERE share_token = p_token
  LIMIT 1;

  IF v_candidate_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT json_build_object(
    'candidate', (SELECT row_to_json(c) FROM (
      SELECT id, name, seniority, cv_url, technical_test_url, hr_interview_notes
      FROM public.candidates WHERE id = v_candidate_id
    ) c),
    'tags', (SELECT COALESCE(json_agg(t), '[]'::json) FROM (
      SELECT tg.id, tg.name
      FROM public.candidate_tags ct
      JOIN public.tags tg ON tg.id = ct.tag_id
      WHERE ct.candidate_id = v_candidate_id
      ORDER BY tg.name
    ) t)
  ) INTO v_result;

  RETURN v_result;
END;
$$;
