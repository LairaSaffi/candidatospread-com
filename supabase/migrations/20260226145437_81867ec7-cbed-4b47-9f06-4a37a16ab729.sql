
-- Adicionar coluna must_change_password na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT false;

-- Marcar todos os usuários existentes como precisando trocar senha
UPDATE public.profiles SET must_change_password = true;
