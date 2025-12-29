-- Adicionar coluna para rastrear quem fez a avaliação (usuário interno vs. externo)
ALTER TABLE public.candidate_evaluations 
ADD COLUMN evaluated_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.candidate_evaluations.evaluated_by_user_id IS 'ID do usuário que fez a avaliação. NULL indica avaliação externa via link.';

-- Atualizar política de INSERT para permitir usuários autenticados
DROP POLICY IF EXISTS "Avaliações requerem link válido para candidato" ON public.candidate_evaluations;

CREATE POLICY "Avaliações por link ou usuário autenticado" 
ON public.candidate_evaluations 
FOR INSERT 
WITH CHECK (
  validate_evaluation_access(job_evaluation_link_id, candidate_id) 
  OR auth.uid() IS NOT NULL
);

-- Atualizar política de UPDATE para permitir usuários autenticados
DROP POLICY IF EXISTS "Atualização de avaliação requer link válido" ON public.candidate_evaluations;

CREATE POLICY "Atualização por link ou usuário autenticado" 
ON public.candidate_evaluations 
FOR UPDATE 
USING (
  validate_evaluation_access(job_evaluation_link_id, candidate_id) 
  OR auth.uid() IS NOT NULL
);