-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Usuários autenticados podem ver perfis autorizados" ON public.profiles;

-- Create new policy that allows admins to see all profiles
CREATE POLICY "Usuários autenticados podem ver perfis autorizados" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND (
    id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  )
);