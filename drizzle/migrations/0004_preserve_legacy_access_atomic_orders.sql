CREATE OR REPLACE FUNCTION public.org_subscription_access(_org uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.is_org_member(_org) AND EXISTS(SELECT 1 FROM public.organization_subscriptions s WHERE s.organization_id=_org AND ((s.stripe_subscription_id IS NULL AND s.status IN ('legacy','active','trialing') AND (s.current_period_end IS NULL OR s.current_period_end>now())) OR (s.paid_confirmed AND s.status IN ('active','past_due','canceled') AND s.current_period_end>now())))
$$;
CREATE OR REPLACE FUNCTION public.save_company_order(_input jsonb,_id uuid DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE org uuid; result uuid; item jsonb;
BEGIN
 org=public.current_org();
 IF NOT public.has_org_permission(org,'orders.manage') OR NOT public.org_has_feature(org,'orders') THEN RAISE EXCEPTION 'Forbidden'; END IF;
 IF jsonb_typeof(_input->'items')!='array' OR jsonb_array_length(_input->'items')=0 THEN RAISE EXCEPTION 'Order must have items'; END IF;
 IF _id IS NULL THEN
 INSERT INTO public.orders(user_id,organization_id,customer_id,address,phone,notes,status,source,route_id) VALUES(auth.uid(),org,(_input->>'customer_id')::uuid,COALESCE(_input->>'address',''),COALESCE(_input->>'phone',''),COALESCE(_input->>'notes',''),COALESCE(_input->>'status','new'),COALESCE(_input->>'source','manual'),(_input->>'route_id')::uuid) RETURNING id INTO result;
 ELSE
 SELECT id INTO result FROM public.orders WHERE id=_id AND organization_id=org FOR UPDATE;
 IF result IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
 UPDATE public.orders SET address=COALESCE(_input->>'address',''),phone=COALESCE(_input->>'phone',''),notes=COALESCE(_input->>'notes','') WHERE id=result;
 DELETE FROM public.order_items WHERE order_id=result;
 END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(_input->'items') LOOP
 IF (item->>'quantity')::numeric<=0 OR (item->>'unit_price')::numeric<0 THEN RAISE EXCEPTION 'Invalid order item'; END IF;
 INSERT INTO public.order_items(user_id,organization_id,order_id,product_id,product_name,unit,unit_price,quantity) VALUES(auth.uid(),org,result,(item->>'product_id')::uuid,item->>'product_name',item->>'unit',(item->>'unit_price')::numeric,(item->>'quantity')::numeric);
 END LOOP;
 IF _id IS NULL THEN INSERT INTO public.deliveries(user_id,organization_id,order_id,status) VALUES(auth.uid(),org,result,'pending'); END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.save_company_order(jsonb,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_company_order(jsonb,uuid) TO authenticated;