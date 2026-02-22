-- Enable Row Level Security on bulk_operation_logs
ALTER TABLE public.bulk_operation_logs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow only administrators to perform operations on bulk_operation_logs
DROP POLICY IF EXISTS "Admins can do everything on bulk_operation_logs" ON public.bulk_operation_logs;
CREATE POLICY "Admins can do everything on bulk_operation_logs" 
  ON public.bulk_operation_logs 
  FOR ALL 
  TO authenticated 
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
