
-- Tabela para links de compartilhamento de múltiplos talentos
CREATE TABLE public.talent_share_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  share_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  created_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de junção: quais candidatos estão em cada link
CREATE TABLE public.talent_share_candidates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  talent_share_link_id UUID NOT NULL REFERENCES public.talent_share_links(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(talent_share_link_id, candidate_id)
);

-- RLS para talent_share_links
ALTER TABLE public.talent_share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view talent share links"
  ON public.talent_share_links FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create talent share links"
  ON public.talent_share_links FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- RLS para talent_share_candidates
ALTER TABLE public.talent_share_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view talent share candidates"
  ON public.talent_share_candidates FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert talent share candidates"
  ON public.talent_share_candidates FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Função SECURITY DEFINER para acesso público via token
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
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', c.id,
          'name', c.name,
          'seniority', c.seniority,
          'cv_url', c.cv_url,
          'technical_test_url', c.technical_test_url,
          'hr_interview_notes', c.hr_interview_notes,
          'tags', (
            SELECT COALESCE(json_agg(
              json_build_object('id', tg.id, 'name', tg.name)
            ), '[]'::json)
            FROM public.candidate_tags ct
            JOIN public.tags tg ON tg.id = ct.tag_id
            WHERE ct.candidate_id = c.id
          )
        )
      ), '[]'::json)
      FROM public.talent_share_candidates tsc
      JOIN public.candidates c ON c.id = tsc.candidate_id
      WHERE tsc.talent_share_link_id = v_link_id
      ORDER BY c.name
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;
