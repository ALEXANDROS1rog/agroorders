-- Keep order creation authorization aligned with the application while preserving
-- the driver's read/delivery-only restriction.
ALTER POLICY customers_insert ON public.customers
  WITH CHECK (
    public.has_org_permission(organization_id, 'customers.create')
    AND public.org_role(organization_id) <> 'driver'
  );

ALTER POLICY orders_insert ON public.orders
  WITH CHECK (
    public.has_org_permission(organization_id, 'orders.create')
    AND public.org_role(organization_id) <> 'driver'
    AND public.org_has_feature(organization_id, 'orders')
  );

CREATE OR REPLACE FUNCTION public.save_company_order(_input jsonb, _id uuid DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  org uuid;
  result uuid;
  item jsonb;
BEGIN
  org := public.current_org();

  IF NOT public.org_has_feature(org, 'orders') THEN
    RAISE EXCEPTION 'An active orders feature is required';
  END IF;

  IF _id IS NULL THEN
    IF public.org_role(org) = 'driver'
       OR NOT public.has_org_permission(org, 'orders.create') THEN
      RAISE EXCEPTION 'Forbidden';
    END IF;
  ELSIF NOT public.has_org_permission(org, 'orders.manage') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF jsonb_typeof(_input->'items') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Order items must be an array';
  END IF;
  IF jsonb_array_length(_input->'items') = 0 THEN
    RAISE EXCEPTION 'Order must have items';
  END IF;

  IF _id IS NULL THEN
    INSERT INTO public.orders(
      user_id, organization_id, customer_id, address, phone, notes, status, source, route_id
    )
    VALUES (
      auth.uid(),
      org,
      (_input->>'customer_id')::uuid,
      COALESCE(_input->>'address', ''),
      COALESCE(_input->>'phone', ''),
      COALESCE(_input->>'notes', ''),
      COALESCE(_input->>'status', 'new'),
      COALESCE(_input->>'source', 'manual'),
      (_input->>'route_id')::uuid
    )
    RETURNING id INTO result;
  ELSE
    SELECT id INTO result
    FROM public.orders
    WHERE id = _id AND organization_id = org
    FOR UPDATE;

    IF result IS NULL THEN
      RAISE EXCEPTION 'Order not found';
    END IF;

    UPDATE public.orders
    SET address = COALESCE(_input->>'address', ''),
        phone = COALESCE(_input->>'phone', ''),
        notes = COALESCE(_input->>'notes', '')
    WHERE id = result;

    DELETE FROM public.order_items WHERE order_id = result;
  END IF;

  FOR item IN SELECT value FROM jsonb_array_elements(_input->'items') LOOP
    IF NULLIF(item->>'quantity', '') IS NULL
       OR NULLIF(item->>'unit_price', '') IS NULL
       OR (item->>'quantity')::numeric <= 0
       OR (item->>'unit_price')::numeric < 0 THEN
      RAISE EXCEPTION 'Invalid order item';
    END IF;

    INSERT INTO public.order_items(
      user_id, organization_id, order_id, product_id, product_name, unit, unit_price, quantity
    )
    VALUES (
      auth.uid(),
      org,
      result,
      (item->>'product_id')::uuid,
      item->>'product_name',
      item->>'unit',
      (item->>'unit_price')::numeric,
      (item->>'quantity')::numeric
    );
  END LOOP;

  IF _id IS NULL THEN
    INSERT INTO public.deliveries(user_id, organization_id, order_id, status)
    VALUES (auth.uid(), org, result, 'pending');
  END IF;

  RETURN result;
END;
$$;
