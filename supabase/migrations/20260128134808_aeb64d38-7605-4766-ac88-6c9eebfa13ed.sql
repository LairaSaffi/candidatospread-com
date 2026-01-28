-- Permitir que donos das vagas possam excluir candidatos
CREATE POLICY "Donos podem excluir candidatos de suas vagas"
ON public.candidates
FOR DELETE
USING (is_job_owner(job_id));