
-- Add candidate_type column
ALTER TABLE public.candidates ADD COLUMN candidate_type TEXT DEFAULT 'externo';

-- Make job_id nullable
ALTER TABLE public.candidates ALTER COLUMN job_id DROP NOT NULL;

-- Create candidate_jobs junction table
CREATE TABLE public.candidate_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(candidate_id, job_id)
);

ALTER TABLE public.candidate_jobs ENABLE ROW LEVEL SECURITY;

-- Migrate existing data
INSERT INTO public.candidate_jobs (candidate_id, job_id)
SELECT id, job_id FROM public.candidates WHERE job_id IS NOT NULL;

-- RLS for candidate_jobs
CREATE POLICY "select_authenticated" ON public.candidate_jobs
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "select_evaluation_link" ON public.candidate_jobs
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.job_evaluation_links jel WHERE jel.job_id = candidate_jobs.job_id)
);

CREATE POLICY "insert_gestao_admins" ON public.candidate_jobs
FOR INSERT WITH CHECK (
  public.is_admin() OR public.has_role(auth.uid(), 'gestao_operacao') OR public.is_job_owner(job_id)
);

CREATE POLICY "delete_gestao_admins" ON public.candidate_jobs
FOR DELETE USING (
  public.is_admin() OR public.is_job_owner(job_id)
);

-- Update candidates INSERT policy
DROP POLICY IF EXISTS "Donos podem criar candidatos em suas vagas" ON public.candidates;
CREATE POLICY "Gestao e admins podem criar candidatos" ON public.candidates
FOR INSERT WITH CHECK (
  CASE
    WHEN job_id IS NULL THEN (public.has_role(auth.uid(), 'gestao_operacao') OR public.is_admin())
    ELSE (public.is_job_owner(job_id) OR public.is_admin() OR public.has_role(auth.uid(), 'gestao_operacao'))
  END
);

-- Update candidates SELECT policy
DROP POLICY IF EXISTS "Qualquer um pode ver candidatos com link de avaliação" ON public.candidates;
CREATE POLICY "Autenticados e avaliadores podem ver candidatos" ON public.candidates
FOR SELECT USING (
  auth.uid() IS NOT NULL
  OR EXISTS (
    SELECT 1 FROM public.candidate_jobs cj
    JOIN public.job_evaluation_links jel ON jel.job_id = cj.job_id
    WHERE cj.candidate_id = candidates.id
  )
);

-- Update candidates UPDATE policy
DROP POLICY IF EXISTS "Donos e admins podem atualizar candidatos" ON public.candidates;
CREATE POLICY "Gestao e admins podem atualizar candidatos" ON public.candidates
FOR UPDATE USING (
  public.is_admin()
  OR public.has_role(auth.uid(), 'gestao_operacao')
  OR (job_id IS NOT NULL AND public.is_job_owner(job_id))
);

-- Update candidates DELETE policy
DROP POLICY IF EXISTS "Donos podem excluir candidatos de suas vagas" ON public.candidates;
CREATE POLICY "Gestao e admins podem excluir candidatos" ON public.candidates
FOR DELETE USING (
  public.is_admin()
  OR (job_id IS NOT NULL AND public.is_job_owner(job_id))
);

-- Update evaluation function to use candidate_jobs
CREATE OR REPLACE FUNCTION public.get_evaluation_data_by_token(p_token uuid)
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_link_id uuid;
  v_job_id uuid;
  v_result json;
BEGIN
  SELECT id, job_id INTO v_link_id, v_job_id
  FROM public.job_evaluation_links WHERE evaluator_token = p_token LIMIT 1;
  IF v_link_id IS NULL THEN RETURN NULL; END IF;
  SELECT json_build_object(
    'evaluation_link_id', v_link_id,
    'job', (SELECT row_to_json(j) FROM (
      SELECT id, title, description, client FROM public.jobs WHERE id = v_job_id
    ) j),
    'candidates', (SELECT COALESCE(json_agg(c), '[]'::json) FROM (
      SELECT c.id, c.name, c.cv_url, c.technical_test_url, c.hr_interview_notes
      FROM public.candidate_jobs cj
      JOIN public.candidates c ON c.id = cj.candidate_id
      WHERE cj.job_id = v_job_id
      ORDER BY c.created_at DESC
    ) c),
    'evaluations', (SELECT COALESCE(json_agg(e), '[]'::json) FROM (
      SELECT candidate_id, decision, justification, interview_schedule_options
      FROM public.candidate_evaluations WHERE job_evaluation_link_id = v_link_id
    ) e)
  ) INTO v_result;
  RETURN v_result;
END;
$function$;

-- Update validate_evaluation_access to use candidate_jobs
CREATE OR REPLACE FUNCTION public.validate_evaluation_access(p_link_id uuid, p_candidate_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.job_evaluation_links jel
    JOIN public.candidate_jobs cj ON cj.job_id = jel.job_id
    WHERE jel.id = p_link_id AND cj.candidate_id = p_candidate_id
  );
$function$;
