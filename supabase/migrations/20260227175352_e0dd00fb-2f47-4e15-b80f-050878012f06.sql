
CREATE OR REPLACE FUNCTION public.get_talents_by_share_token(p_token uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_link_id uuid;
  v_result json;
BEGIN
  SELECT id INTO v_link_id
  FROM public.talent_share_links
  WHERE share_token = p_token
  LIMIT 1;

  IF v_link_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT json_build_object(
    'candidates', (
      SELECT COALESCE(json_agg(candidate_data ORDER BY candidate_data.name), '[]'::json)
      FROM (
        SELECT
          c.id,
          c.name,
          c.seniority,
          c.cv_url,
          c.technical_test_url,
          c.hr_interview_notes,
          (
            SELECT COALESCE(json_agg(
              json_build_object('id', tg.id, 'name', tg.name)
            ), '[]'::json)
            FROM public.candidate_tags ct
            JOIN public.tags tg ON tg.id = ct.tag_id
            WHERE ct.candidate_id = c.id
          ) AS tags
        FROM public.talent_share_candidates tsc
        JOIN public.candidates c ON c.id = tsc.candidate_id
        WHERE tsc.talent_share_link_id = v_link_id
      ) candidate_data
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;
