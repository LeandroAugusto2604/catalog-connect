
-- Fix search_path on trigger fn
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Restrict has_role execution
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Replace permissive insert checks with validation
DROP POLICY "Anyone can create quotes" ON public.quotes;
CREATE POLICY "Anyone can create quotes"
  ON public.quotes FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(customer_name) BETWEEN 1 AND 200
    AND length(customer_email) BETWEEN 3 AND 320
    AND customer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND length(customer_whatsapp) BETWEEN 5 AND 40
    AND length(customer_address) BETWEEN 1 AND 1000
    AND total >= 0
  );

DROP POLICY "Anyone can create quote items" ON public.quote_items;
CREATE POLICY "Anyone can create quote items"
  ON public.quote_items FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    quantity > 0
    AND unit_price >= 0
    AND subtotal >= 0
    AND length(product_name) BETWEEN 1 AND 300
  );
