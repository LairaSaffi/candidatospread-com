-- Reverter responsible_manager para campo de texto
ALTER TABLE public.jobs 
DROP COLUMN responsible_manager_id,
ADD COLUMN responsible_manager text;