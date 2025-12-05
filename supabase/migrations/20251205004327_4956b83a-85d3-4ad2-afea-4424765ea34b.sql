-- Função RPC para obter dados de avaliação por token (acesso público)
CREATE OR REPLACE FUNCTION public.get_evaluation_data_by_token(p_token uuid)
RETURNS JSON
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_link_id uuid;
  v_job_id uuid;
  v_result json;
BEGIN
  -- Validar token e obter link_id e job_id
  SELECT id, job_id INTO v_link_id, v_job_id
  FROM public.job_evaluation_links
  WHERE evaluator_token = p_token
  LIMIT 1;
  
  IF v_link_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Retornar todos os dados em uma única query
  SELECT json_build_object(
    'evaluation_link_id', v_link_id,
    'job', (SELECT row_to_json(j) FROM (
      SELECT id, title, description, client FROM public.jobs WHERE id = v_job_id
    ) j),
    'candidates', (SELECT COALESCE(json_agg(c), '[]'::json) FROM (
      SELECT id, name, cv_url, technical_test_url, hr_interview_notes
      FROM public.candidates WHERE job_id = v_job_id
      ORDER BY created_at DESC
    ) c),
    'evaluations', (SELECT COALESCE(json_agg(e), '[]'::json) FROM (
      SELECT candidate_id, decision, justification, interview_schedule_options
      FROM public.candidate_evaluations WHERE job_evaluation_link_id = v_link_id
    ) e)
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- Garantir que a função pode ser chamada por usuários anônimos
GRANT EXECUTE ON FUNCTION public.get_evaluation_data_by_token(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_evaluation_data_by_token(uuid) TO authenticated;