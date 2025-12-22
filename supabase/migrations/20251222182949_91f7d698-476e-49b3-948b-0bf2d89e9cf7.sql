-- Adicionar novas colunas para IDs de usuários
ALTER TABLE public.jobs 
ADD COLUMN responsible_manager_id uuid REFERENCES public.profiles(id),
ADD COLUMN spread_manager_id uuid REFERENCES public.profiles(id),
ADD COLUMN commercial_responsible_id uuid REFERENCES public.profiles(id),
ADD COLUMN recruiter_responsible_id uuid REFERENCES public.profiles(id);

-- Remover colunas de texto antigas (os dados atuais são de demonstração)
ALTER TABLE public.jobs 
DROP COLUMN responsible_manager,
DROP COLUMN spread_manager,
DROP COLUMN commercial_responsible,
DROP COLUMN recruiter_responsible;