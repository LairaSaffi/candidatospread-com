-- Adiciona coluna para opções de horários de entrevista
ALTER TABLE candidate_evaluations 
ADD COLUMN IF NOT EXISTS interview_schedule_options text;

-- Remove políticas antigas que exigem autenticação
DROP POLICY IF EXISTS "Usuários autenticados podem ver todas as vagas" ON jobs;
DROP POLICY IF EXISTS "Usuários autenticados podem ver candidatos" ON candidates;

-- Permite que qualquer um veja vagas que têm links de avaliação
CREATE POLICY "Qualquer um pode ver vagas com link de avaliação"
ON jobs FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  OR 
  EXISTS (
    SELECT 1 FROM job_evaluation_links 
    WHERE job_evaluation_links.job_id = jobs.id
  )
);

-- Permite que qualquer um veja candidatos de vagas com links de avaliação
CREATE POLICY "Qualquer um pode ver candidatos com link de avaliação"
ON candidates FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  OR 
  EXISTS (
    SELECT 1 FROM job_evaluation_links 
    WHERE job_evaluation_links.job_id = candidates.job_id
  )
);