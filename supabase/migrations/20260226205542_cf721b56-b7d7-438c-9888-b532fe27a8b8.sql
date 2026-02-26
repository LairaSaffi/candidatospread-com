
-- Add internal_status column to candidates
ALTER TABLE public.candidates ADD COLUMN internal_status text DEFAULT NULL;
