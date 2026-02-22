-- Create trigger function to restrict role updates to admins only
CREATE OR REPLACE FUNCTION public.check_user_role_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Only admins can modify user roles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach the trigger before update on public.users
CREATE OR REPLACE TRIGGER enforce_user_role_update
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.check_user_role_update();
