
-- Hunter links table - links generated for external hunters
CREATE TABLE public.hunter_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  hunter_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hunter_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ver hunter links" ON public.hunter_links
  FOR SELECT TO authenticated USING (is_admin());

CREATE POLICY "Admins podem criar hunter links" ON public.hunter_links
  FOR INSERT TO authenticated WITH CHECK (is_admin());

CREATE POLICY "Admins podem deletar hunter links" ON public.hunter_links
  FOR DELETE TO authenticated USING (is_admin());

-- Hunter candidates table - candidates submitted by external hunters
CREATE TABLE public.hunter_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hunter_link_id uuid NOT NULL REFERENCES public.hunter_links(id) ON DELETE CASCADE,
  name text NOT NULL,
  position text,
  seniority text,
  candidate_type text DEFAULT 'externo',
  salary_expectation text,
  hiring_model text,
  hr_notes text,
  cv_url text,
  spread_cv_url text,
  adherent boolean,
  adherent_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hunter_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ver hunter candidates" ON public.hunter_candidates
  FOR SELECT TO authenticated USING (is_admin());

CREATE POLICY "Admins podem atualizar hunter candidates" ON public.hunter_candidates
  FOR UPDATE TO authenticated USING (is_admin());

-- Hunter candidate tags
CREATE TABLE public.hunter_candidate_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hunter_candidate_id uuid NOT NULL REFERENCES public.hunter_candidates(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hunter_candidate_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ver hunter candidate tags" ON public.hunter_candidate_tags
  FOR SELECT TO authenticated USING (is_admin());

-- Security definer function to get hunter form data by token (public access)
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
      SELECT id, title, client, description FROM public.jobs WHERE id = v_job_id
    ) j),
    'tags', (SELECT COALESCE(json_agg(t ORDER BY t.name), '[]'::json) FROM (
      SELECT id, name FROM public.tags
    ) t)
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- Storage bucket for spread CVs
INSERT INTO storage.buckets (id, name, public) VALUES ('spread-cvs', 'spread-cvs', true);

-- Public read policy for spread-cvs
CREATE POLICY "Público pode ver spread cvs" ON storage.objects
  FOR SELECT USING (bucket_id = 'spread-cvs');

-- Allow authenticated users to upload to spread-cvs
CREATE POLICY "Autenticados podem fazer upload spread cvs" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'spread-cvs');
