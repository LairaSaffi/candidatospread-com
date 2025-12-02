-- Adicionar novos campos na tabela jobs
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS work_model text,
ADD COLUMN IF NOT EXISTS client text,
ADD COLUMN IF NOT EXISTS responsible_manager text,
ADD COLUMN IF NOT EXISTS spread_manager text,
ADD COLUMN IF NOT EXISTS commercial_responsible text,
ADD COLUMN IF NOT EXISTS recruiter_responsible text;

-- Remover campos antigos da tabela jobs
ALTER TABLE public.jobs 
DROP COLUMN IF EXISTS department,
DROP COLUMN IF EXISTS location,
DROP COLUMN IF EXISTS employment_type;

-- Remover campos da tabela candidates
ALTER TABLE public.candidates 
DROP COLUMN IF EXISTS phone,
DROP COLUMN IF EXISTS email;