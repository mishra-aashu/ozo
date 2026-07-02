-- Drop current permissive INSERT policy on public.notifications
DROP POLICY IF EXISTS "Anyone can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;

-- Create secure INSERT policy restricting users to inserting notifications only for themselves
CREATE POLICY "Users can insert own notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create trigger function to ensure non-admins can only update 'is_read' column on notifications
CREATE OR REPLACE FUNCTION public.check_notification_update_integrity()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow direct database updates (migrations, background scripts, direct SQL where auth.uid() is null)
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT public.is_admin() THEN
    IF NEW.id IS DISTINCT FROM OLD.id OR
       NEW.user_id IS DISTINCT FROM OLD.user_id OR
       NEW.title IS DISTINCT FROM OLD.title OR
       NEW.message IS DISTINCT FROM OLD.message OR
       NEW.type IS DISTINCT FROM OLD.type OR
       NEW.data IS DISTINCT FROM OLD.data OR
       NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Unauthorized: Only the is_read status can be updated on notifications';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on notifications table
DROP TRIGGER IF EXISTS enforce_notification_update_integrity ON public.notifications;
CREATE TRIGGER enforce_notification_update_integrity
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.check_notification_update_integrity();


-- Allow users (customers) to update status of their own orders to 'cancelled' (if pending/placed)
DROP POLICY IF EXISTS "Users can cancel own pending orders" ON public.orders;
CREATE POLICY "Users can cancel own pending orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status IN ('pending', 'placed'))
  WITH CHECK (auth.uid() = user_id AND status = 'cancelled');


-- Create trigger function to enforce order update integrity based on roles
CREATE OR REPLACE FUNCTION public.check_order_update_integrity()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow direct database updates (migrations, background scripts, direct SQL where auth.uid() is null)
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Admins can update anything
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- 1. Enforce strict immutability on core financial and metadata properties
  IF NEW.id IS DISTINCT FROM OLD.id OR
     NEW.order_number IS DISTINCT FROM OLD.order_number OR
     NEW.user_id IS DISTINCT FROM OLD.user_id OR
     NEW.subtotal IS DISTINCT FROM OLD.subtotal OR
     NEW.delivery_fee IS DISTINCT FROM OLD.delivery_fee OR
     NEW.discount IS DISTINCT FROM OLD.discount OR
     NEW.total IS DISTINCT FROM OLD.total OR
     NEW.coupon_code IS DISTINCT FROM OLD.coupon_code OR
     NEW.created_at IS DISTINCT FROM OLD.created_at OR
     NEW.mart_id IS DISTINCT FROM OLD.mart_id OR
     NEW.payment_method IS DISTINCT FROM OLD.payment_method OR
     NEW.latitude IS DISTINCT FROM OLD.latitude OR
     NEW.longitude IS DISTINCT FROM OLD.longitude OR
     NEW.address_id IS DISTINCT FROM OLD.address_id THEN
    RAISE EXCEPTION 'Unauthorized: Modification of core order details (id, order_number, user_id, financials, payment method, coordinates, address) is prohibited';
  END IF;

  -- 2. Role-based update restrictions
  IF public.is_captain() THEN
    -- Captains are only allowed to update status, payment_status, rider_id, delivered_at, delivery_proof_image_1, delivery_proof_image_2, updated_at
    IF NEW.estimated_delivery IS DISTINCT FROM OLD.estimated_delivery OR
       NEW.delivery_instructions IS DISTINCT FROM OLD.delivery_instructions OR
       NEW.recipient_name IS DISTINCT FROM OLD.recipient_name OR
       NEW.recipient_phone IS DISTINCT FROM OLD.recipient_phone OR
       NEW.house_no IS DISTINCT FROM OLD.house_no OR
       NEW.street_gali IS DISTINCT FROM OLD.street_gali OR
       NEW.landmark IS DISTINCT FROM OLD.landmark OR
       NEW.delivery_city IS DISTINCT FROM OLD.delivery_city OR
       NEW.google_maps_url IS DISTINCT FROM OLD.google_maps_url OR
       NEW.order_for IS DISTINCT FROM OLD.order_for THEN
      RAISE EXCEPTION 'Unauthorized: Captains cannot modify customer address, instructions, or recipient details';
    END IF;

    -- Enforce that captains only assign/reassign to themselves
    IF NEW.rider_id IS DISTINCT FROM OLD.rider_id THEN
      IF OLD.rider_id IS NOT NULL THEN
        RAISE EXCEPTION 'Unauthorized: Captains cannot reassign orders that are already assigned to someone else';
      END IF;
      IF NEW.rider_id IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized: Captains can only assign orders to themselves';
      END IF;
    END IF;

    -- Enforce valid status transitions for captains
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NOT (
        (OLD.status = 'packed' AND NEW.status = 'assigned') OR
        (OLD.status = 'assigned' AND NEW.status = 'preparing_order') OR
        (OLD.status = 'preparing_order' AND NEW.status = 'dispatched') OR
        (OLD.status = 'dispatched' AND NEW.status = 'delivered')
      ) THEN
        RAISE EXCEPTION 'Invalid status transition: Captains cannot transition order status from % to %', OLD.status, NEW.status;
      END IF;
    END IF;

    -- Enforce payment status change logic for captains
    IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
      IF NEW.payment_status != 'paid' THEN
        RAISE EXCEPTION 'Unauthorized: Captains can only update payment status to paid upon delivery';
      END IF;
      IF NEW.status != 'delivered' THEN
        RAISE EXCEPTION 'Unauthorized: Captains can only mark payment status as paid when status is delivered';
      END IF;
    END IF;

  ELSIF public.is_mart_operator() THEN
    -- Mart operators can change status, rider_id, estimated_delivery, updated_at
    -- They cannot change delivery proof images
    IF NEW.delivery_proof_image_1 IS DISTINCT FROM OLD.delivery_proof_image_1 OR
       NEW.delivery_proof_image_2 IS DISTINCT FROM OLD.delivery_proof_image_2 OR
       NEW.delivered_at IS DISTINCT FROM OLD.delivered_at THEN
      RAISE EXCEPTION 'Unauthorized: Mart operators cannot modify delivery proof or delivery timestamps';
    END IF;

  ELSE
    -- Customer/User
    -- Customers can only cancel their own order
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NEW.status != 'cancelled' THEN
        RAISE EXCEPTION 'Unauthorized: Customers can only cancel their orders';
      END IF;
      IF NOT (OLD.status IN ('pending', 'placed')) THEN
        RAISE EXCEPTION 'Unauthorized: Customers can only cancel orders that are pending or placed';
      END IF;
    END IF;

    -- Customers cannot change rider_id, payment_status, delivery proof, delivered_at
    IF NEW.rider_id IS DISTINCT FROM OLD.rider_id OR
       NEW.payment_status IS DISTINCT FROM OLD.payment_status OR
       NEW.delivery_proof_image_1 IS DISTINCT FROM OLD.delivery_proof_image_1 OR
       NEW.delivery_proof_image_2 IS DISTINCT FROM OLD.delivery_proof_image_2 OR
       NEW.delivered_at IS DISTINCT FROM OLD.delivered_at OR
       NEW.estimated_delivery IS DISTINCT FROM OLD.estimated_delivery THEN
      RAISE EXCEPTION 'Unauthorized: Customers cannot modify rider assignment, payment status, delivery proof, or delivery metadata';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on orders table
DROP TRIGGER IF EXISTS enforce_order_update_integrity ON public.orders;
CREATE TRIGGER enforce_order_update_integrity
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.check_order_update_integrity();


-- Create trigger function to ensure review integrity and authenticity
CREATE OR REPLACE FUNCTION public.check_review_integrity()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow direct database updates (migrations, background scripts, direct SQL where auth.uid() is null)
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Non-admins cannot set is_image_approved to true
  IF NOT public.is_admin() THEN
    IF NEW.is_image_approved = true AND (OLD IS NULL OR OLD.is_image_approved IS DISTINCT FROM true) THEN
      RAISE EXCEPTION 'Only admins can approve review images';
    END IF;
  END IF;

  -- Validate is_verified and order_id
  IF NEW.is_verified = true THEN
    IF NEW.order_id IS NULL THEN
      RAISE EXCEPTION 'Verified reviews must be linked to a valid order';
    END IF;

    -- Verify that the order exists, belongs to the user, is delivered, and contains the product
    IF NOT EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.order_items oi ON o.id = oi.order_id
      WHERE o.id = NEW.order_id 
        AND o.user_id = NEW.user_id 
        AND o.status = 'delivered' 
        AND oi.product_id = NEW.product_id
    ) THEN
      RAISE EXCEPTION 'Review verification failed. You can only write a verified review for products you have purchased and had delivered.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on reviews table
DROP TRIGGER IF EXISTS enforce_review_integrity ON public.reviews;
CREATE TRIGGER enforce_review_integrity
  BEFORE INSERT OR UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.check_review_integrity();
