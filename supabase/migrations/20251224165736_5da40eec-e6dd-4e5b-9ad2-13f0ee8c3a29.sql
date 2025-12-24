-- Allow admins to delete any ticket
CREATE POLICY "Admins can delete any ticket" 
ON public.tickets 
FOR DELETE 
USING (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.is_admin = true))));