-- Permitir que admins deletem vagas
CREATE POLICY "Admins podem deletar vagas" 
ON public.jobs 
FOR DELETE 
USING (is_admin());