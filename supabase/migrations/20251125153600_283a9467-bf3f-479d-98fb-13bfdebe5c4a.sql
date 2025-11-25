-- Criação de tabelas para plataforma de recrutamento

-- Tabela de vagas
CREATE TABLE public.jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  department TEXT,
  location TEXT,
  employment_type TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'on_hold')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Tabela de candidatos
CREATE TABLE public.candidates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  cv_url TEXT,
  technical_test_url TEXT,
  hr_interview_notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de avaliações externas
CREATE TABLE public.evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  evaluator_token UUID NOT NULL DEFAULT gen_random_uuid(),
  decision TEXT CHECK (decision IN ('interested', 'rejected')),
  justification TEXT,
  evaluated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_candidates_job_id ON public.candidates(job_id);
CREATE INDEX idx_evaluations_candidate_id ON public.evaluations(candidate_id);
CREATE INDEX idx_evaluations_token ON public.evaluations(evaluator_token);

-- Enable Row Level Security
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para jobs
CREATE POLICY "Usuários autenticados podem ver todas as vagas"
  ON public.jobs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem criar vagas"
  ON public.jobs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Usuários autenticados podem atualizar vagas"
  ON public.jobs FOR UPDATE
  TO authenticated
  USING (true);

-- Políticas RLS para candidates
CREATE POLICY "Usuários autenticados podem ver candidatos"
  ON public.candidates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem criar candidatos"
  ON public.candidates FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar candidatos"
  ON public.candidates FOR UPDATE
  TO authenticated
  USING (true);

-- Políticas RLS para evaluations (acesso público por token)
CREATE POLICY "Qualquer um pode ver avaliações pelo token"
  ON public.evaluations FOR SELECT
  USING (true);

CREATE POLICY "Qualquer um pode criar avaliações"
  ON public.evaluations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Qualquer um pode atualizar avaliações pelo token"
  ON public.evaluations FOR UPDATE
  USING (true);

-- Função para atualizar timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at
CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_candidates_updated_at
  BEFORE UPDATE ON public.candidates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Criar buckets de storage para CVs e testes técnicos
INSERT INTO storage.buckets (id, name, public)
VALUES ('cvs', 'cvs', false);

INSERT INTO storage.buckets (id, name, public)
VALUES ('technical-tests', 'technical-tests', false);

-- Políticas de storage para CVs
CREATE POLICY "Usuários autenticados podem fazer upload de CVs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'cvs');

CREATE POLICY "Usuários autenticados podem ver CVs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'cvs');

-- Políticas de storage para testes técnicos
CREATE POLICY "Usuários autenticados podem fazer upload de testes"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'technical-tests');

CREATE POLICY "Usuários autenticados podem ver testes"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'technical-tests');