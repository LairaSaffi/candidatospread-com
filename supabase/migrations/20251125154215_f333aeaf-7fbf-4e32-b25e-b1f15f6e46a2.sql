-- Modificar estrutura de avaliações para ser por vaga, não por candidato

-- Remover tabela de avaliações antiga
DROP TABLE IF EXISTS public.evaluations CASCADE;

-- Criar nova tabela de avaliações por vaga
CREATE TABLE public.job_evaluation_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  evaluator_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para avaliações de cada candidato
CREATE TABLE public.candidate_evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_evaluation_link_id UUID NOT NULL REFERENCES public.job_evaluation_links(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  decision TEXT CHECK (decision IN ('interested', 'rejected')),
  justification TEXT,
  evaluated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(job_evaluation_link_id, candidate_id)
);

-- Índices
CREATE INDEX idx_job_evaluation_links_job_id ON public.job_evaluation_links(job_id);
CREATE INDEX idx_job_evaluation_links_token ON public.job_evaluation_links(evaluator_token);
CREATE INDEX idx_candidate_evaluations_link_id ON public.candidate_evaluations(job_evaluation_link_id);
CREATE INDEX idx_candidate_evaluations_candidate_id ON public.candidate_evaluations(candidate_id);

-- Enable RLS
ALTER TABLE public.job_evaluation_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_evaluations ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para job_evaluation_links
CREATE POLICY "Usuários autenticados podem ver links de avaliação"
  ON public.job_evaluation_links FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem criar links de avaliação"
  ON public.job_evaluation_links FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Qualquer um pode ver links pelo token"
  ON public.job_evaluation_links FOR SELECT
  USING (true);

-- Políticas RLS para candidate_evaluations
CREATE POLICY "Qualquer um pode ver avaliações de candidatos"
  ON public.candidate_evaluations FOR SELECT
  USING (true);

CREATE POLICY "Qualquer um pode criar avaliações de candidatos"
  ON public.candidate_evaluations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Qualquer um pode atualizar avaliações de candidatos"
  ON public.candidate_evaluations FOR UPDATE
  USING (true);