-- Add is_active column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN is_active boolean NOT NULL DEFAULT true;

-- Add index for filtering active users
CREATE INDEX idx_profiles_is_active ON public.profiles(is_active);