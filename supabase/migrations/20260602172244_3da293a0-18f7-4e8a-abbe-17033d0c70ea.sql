-- Remover check constraint antigo
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_status_check;

-- Atualizar registros existentes para o novo status
UPDATE public.jobs SET status = 'cancelled' WHERE status IN ('closed', 'on_hold');

-- Adicionar novo check constraint com os valores permitidos
ALTER TABLE public.jobs ADD CONSTRAINT jobs_status_check CHECK (status = ANY (ARRAY['open'::text, 'cancelled'::text]));