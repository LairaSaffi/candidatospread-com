
CREATE OR REPLACE FUNCTION public.get_hunter_form_data(p_token uuid)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_link_id uuid;
  v_job_id uuid;
  v_result json;
BEGIN
  SELECT id, job_id INTO v_link_id, v_job_id
  FROM public.hunter_links WHERE hunter_token = p_token LIMIT 1;
  
  IF v_link_id IS NULL THEN RETURN NULL; END IF;
  
  SELECT json_build_object(
    'hunter_link_id', v_link_id,
    'job', (SELECT row_to_json(j) FROM (
      SELECT id, title, description, budget, hiring_model, work_model FROM public.jobs WHERE id = v_job_id
    ) j),
    'tags', (SELECT COALESCE(json_agg(t ORDER BY t.name), '[]'::json) FROM (
      SELECT id, name FROM public.tags
    ) t)
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;
