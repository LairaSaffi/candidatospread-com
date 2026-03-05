
-- talent_share_links: restringir INSERT para gestao, comercial e admin
DROP POLICY IF EXISTS "Autenticados podem criar talent share links" ON public.talent_share_links;

CREATE POLICY "Gestão comercial e admins podem criar talent share links"
ON public.talent_share_links FOR INSERT TO authenticated
WITH CHECK (
  is_admin() OR 
  has_role(auth.uid(), 'gestao_operacao') OR 
  has_role(auth.uid(), 'comercial')
);

-- talent_share_candidates: mesma restrição
DROP POLICY IF EXISTS "Autenticados podem criar talent share candidates" ON public.talent_share_candidates;

CREATE POLICY "Gestão comercial e admins podem criar talent share candidates"
ON public.talent_share_candidates FOR INSERT TO authenticated
WITH CHECK (
  is_admin() OR 
  has_role(auth.uid(), 'gestao_operacao') OR 
  has_role(auth.uid(), 'comercial')
);

-- candidate_share_links: adicionar comercial
DROP POLICY IF EXISTS "Gestão owners e admins podem criar share links" ON public.candidate_share_links;

CREATE POLICY "Gestão comercial owners e admins podem criar share links"
ON public.candidate_share_links FOR INSERT TO authenticated
WITH CHECK (
  is_admin() OR 
  has_role(auth.uid(), 'gestao_operacao') OR 
  has_role(auth.uid(), 'comercial') OR
  (EXISTS (
    SELECT 1 FROM candidates c JOIN jobs j ON j.id = c.job_id
    WHERE c.id = candidate_share_links.candidate_id AND j.created_by = auth.uid()
  ))
);
