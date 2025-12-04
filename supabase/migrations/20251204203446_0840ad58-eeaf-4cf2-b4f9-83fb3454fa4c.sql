-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Qualquer um pode criar avaliações de candidatos" ON public.candidate_evaluations;
DROP POLICY IF EXISTS "Qualquer um pode atualizar avaliações de candidatos" ON public.candidate_evaluations;
DROP POLICY IF EXISTS "Qualquer um pode ver avaliações de candidatos" ON public.candidate_evaluations;

-- Create function to validate evaluation link and candidate match
CREATE OR REPLACE FUNCTION public.validate_evaluation_access(p_link_id uuid, p_candidate_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.job_evaluation_links jel
    JOIN public.candidates c ON c.job_id = jel.job_id
    WHERE jel.id = p_link_id
      AND c.id = p_candidate_id
  );
$$;

-- Create function to check if user can view evaluation (authenticated or has valid link)
CREATE OR REPLACE FUNCTION public.can_view_evaluation(p_link_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (auth.uid() IS NOT NULL) OR EXISTS (
    SELECT 1 FROM public.job_evaluation_links WHERE id = p_link_id
  );
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.validate_evaluation_access(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_evaluation(uuid) TO anon, authenticated;

-- Create secure INSERT policy: only allow if link and candidate are valid
CREATE POLICY "Avaliações requerem link válido para candidato"
ON public.candidate_evaluations
FOR INSERT
WITH CHECK (
  public.validate_evaluation_access(job_evaluation_link_id, candidate_id)
);

-- Create secure UPDATE policy: only allow if link and candidate are valid (no decision change after set)
CREATE POLICY "Atualização de avaliação requer link válido"
ON public.candidate_evaluations
FOR UPDATE
USING (
  public.validate_evaluation_access(job_evaluation_link_id, candidate_id)
);

-- Create secure SELECT policy: authenticated users or valid link holders
CREATE POLICY "Visualização de avaliações com permissão"
ON public.candidate_evaluations
FOR SELECT
USING (
  (auth.uid() IS NOT NULL) OR public.can_view_evaluation(job_evaluation_link_id)
);