-- Allow DELETE on users table using service role (admin functions will use service role key)
CREATE POLICY "Service role can delete users" 
ON public.users 
FOR DELETE 
USING (true);

-- Allow DELETE on attendance table for cascade cleanup
CREATE POLICY "Service role can delete attendance" 
ON public.attendance 
FOR DELETE 
USING (true);