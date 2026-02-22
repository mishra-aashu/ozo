-- Drop the existing policies for mart operators on users and addresses
DROP POLICY IF EXISTS "Mart operators can view customer profiles for approved self-del" ON public.users;
DROP POLICY IF EXISTS "Mart operators can view addresses for approved self-delivery" ON public.addresses;

-- Recreate the policies to explicitly exclude all delivered, completed, cancelled, and verifying/return statuses
CREATE POLICY "Mart operators can view customer profiles for approved self-del" ON public.users
AS PERMISSIVE FOR SELECT TO authenticated
USING (
  is_mart_operator() AND EXISTS (
    SELECT 1 FROM public.orders
    JOIN public.marts ON orders.mart_id = marts.id
    WHERE orders.user_id = users.id
      AND marts.owner_id = auth.uid()
      AND orders.delivery_instructions ~~* '%[SELF_DELIVERY_APPROVED]%'
      AND orders.status NOT IN ('delivered', 'DELIVERED_VERIFYING', 'COMPLETED', 'cancelled', 'CANCELLED_BY_USER', 'RETURN_REQUESTED')
  )
);

CREATE POLICY "Mart operators can view addresses for approved self-delivery" ON public.addresses
AS PERMISSIVE FOR SELECT TO authenticated
USING (
  is_mart_operator() AND EXISTS (
    SELECT 1 FROM public.orders
    JOIN public.marts ON orders.mart_id = marts.id
    WHERE orders.address_id = addresses.id
      AND marts.owner_id = auth.uid()
      AND orders.delivery_instructions ~~* '%[SELF_DELIVERY_APPROVED]%'
      AND orders.status NOT IN ('delivered', 'DELIVERED_VERIFYING', 'COMPLETED', 'cancelled', 'CANCELLED_BY_USER', 'RETURN_REQUESTED')
  )
);
