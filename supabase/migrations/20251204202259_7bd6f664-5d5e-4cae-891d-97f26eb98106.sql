-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Qualquer um pode ver links pelo token" ON public.job_evaluation_links;

-- Create a security definer function to safely lookup evaluation links by token
-- This prevents token enumeration since it only returns data for exact token matches
CREATE OR REPLACE FUNCTION public.get_evaluation_link_by_token(p_token uuid)
RETURNS TABLE (
  id uuid,
  job_id uuid,
  evaluator_token uuid,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, job_id, evaluator_token, created_at
  FROM public.job_evaluation_links
  WHERE evaluator_token = p_token
  LIMIT 1;
$$;

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.get_evaluation_link_by_token(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_evaluation_link_by_token(uuid) TO authenticated;