ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS assigned_driver_id uuid;
ALTER TABLE public.delivery_routes ADD COLUMN IF NOT EXISTS assigned_driver_id uuid;
CREATE OR REPLACE FUNCTION public.can_access_order(_order uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.orders o WHERE o.id=_order AND public.is_org_member(o.organization_id) AND (public.org_role(o.organization_id) IN ('owner','manager') OR EXISTS(SELECT 1 FROM public.deliveries d WHERE d.order_id=o.id AND d.organization_id=o.organization_id AND d.assigned_driver_id=auth.uid()) OR EXISTS(SELECT 1 FROM public.delivery_routes r WHERE r.id=o.route_id AND r.organization_id=o.organization_id AND r.assigned_driver_id=auth.uid())))
$$;
ALTER POLICY orders_view ON public.orders USING(public.has_org_permission(organization_id,'orders.view') AND public.can_access_order(id));
ALTER POLICY orders_update ON public.orders USING(public.has_org_permission(organization_id,'orders.status') AND public.can_access_order(id)) WITH CHECK(public.has_org_permission(organization_id,'orders.status') AND public.can_access_order(id));
ALTER POLICY order_items_view ON public.order_items USING(public.has_org_permission(organization_id,'orders.view') AND public.can_access_order(order_id));
ALTER POLICY deliveries_view ON public.deliveries USING(public.has_org_permission(organization_id,'deliveries.view') AND public.can_access_order(order_id));
ALTER POLICY deliveries_update ON public.deliveries USING(public.has_org_permission(organization_id,'deliveries.update') AND public.can_access_order(order_id)) WITH CHECK(public.has_org_permission(organization_id,'deliveries.update') AND public.can_access_order(order_id));
ALTER POLICY routes_view ON public.delivery_routes USING(public.has_org_permission(organization_id,'routes.view') AND (public.org_role(organization_id) IN ('owner','manager') OR assigned_driver_id=auth.uid()));
ALTER POLICY customers_view ON public.customers USING(public.has_org_permission(organization_id,'customers.view') AND (public.org_role(organization_id) IN ('owner','manager') OR EXISTS(SELECT 1 FROM public.orders o WHERE o.customer_id=customers.id AND public.can_access_order(o.id))));
ALTER POLICY orders_insert ON public.orders WITH CHECK(public.has_org_permission(organization_id,'orders.manage') AND public.org_has_feature(organization_id,'orders'));
ALTER POLICY customers_insert ON public.customers WITH CHECK(public.has_org_permission(organization_id,'customers.manage') AND public.org_has_feature(organization_id,'customers'));
CREATE OR REPLACE FUNCTION public.assignment_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF TG_OP='UPDATE' AND NEW.assigned_driver_id IS DISTINCT FROM OLD.assigned_driver_id AND auth.uid() IS NOT NULL AND public.org_role(NEW.organization_id) NOT IN ('owner','manager') THEN RAISE EXCEPTION 'Only managers assign deliveries'; END IF;
 IF NEW.assigned_driver_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.organization_members m WHERE m.organization_id=NEW.organization_id AND m.user_id=NEW.assigned_driver_id AND m.status='active' AND m.role IN ('driver','manager','owner')) THEN RAISE EXCEPTION 'Assignee is not an active company member'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER z_assignment_guard BEFORE INSERT OR UPDATE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION public.assignment_guard();
CREATE TRIGGER z_assignment_guard BEFORE INSERT OR UPDATE ON public.delivery_routes FOR EACH ROW EXECUTE FUNCTION public.assignment_guard();
CREATE OR REPLACE FUNCTION public.set_delivery_state(_order uuid,_status text,_lat double precision DEFAULT NULL,_lng double precision DEFAULT NULL,_auto boolean DEFAULT false) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE org uuid;
BEGIN
 IF _status NOT IN ('new','preparing','ready','delivering','delivered','cancelled') THEN RAISE EXCEPTION 'Invalid status'; END IF;
 SELECT organization_id INTO org FROM public.orders WHERE id=_order FOR UPDATE;
 IF org IS NULL OR NOT public.can_access_order(_order) OR NOT public.has_org_permission(org,'deliveries.update') OR NOT public.org_has_feature(org,'deliveries') THEN RAISE EXCEPTION 'Forbidden'; END IF;
 IF public.org_role(org)='driver' AND _status NOT IN ('delivering','delivered') THEN RAISE EXCEPTION 'Drivers can only start or complete assigned deliveries'; END IF;
 IF _auto AND (NOT public.org_has_feature(org,'auto_arrival') OR _lat IS NULL OR _lng IS NULL) THEN RAISE EXCEPTION 'Automatic arrival unavailable'; END IF;
 UPDATE public.orders SET status=_status WHERE id=_order;
 UPDATE public.deliveries SET status=CASE _status WHEN 'delivering' THEN 'in_progress' WHEN 'delivered' THEN 'delivered' WHEN 'cancelled' THEN 'cancelled' ELSE 'pending' END,delivered_at=CASE WHEN _status='delivered' THEN now() ELSE NULL END,delivered_lat=CASE WHEN _status='delivered' THEN _lat ELSE NULL END,delivered_lng=CASE WHEN _status='delivered' THEN _lng ELSE NULL END,auto_confirmed=_status='delivered' AND _auto WHERE order_id=_order;
 IF NOT FOUND THEN RAISE EXCEPTION 'Delivery missing'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.set_delivery_state(uuid,text,double precision,double precision,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_delivery_state(uuid,text,double precision,double precision,boolean) TO authenticated;
CREATE OR REPLACE FUNCTION public.operational_plan_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE feature text; org uuid;
BEGIN
 IF auth.uid() IS NULL THEN RETURN COALESCE(NEW,OLD); END IF;
 org=CASE WHEN TG_OP='DELETE' THEN OLD.organization_id ELSE NEW.organization_id END;
 feature=CASE TG_TABLE_NAME WHEN 'order_items' THEN 'orders' WHEN 'delivery_routes' THEN 'routes' WHEN 'ai_transcriptions' THEN 'voice_ai' ELSE TG_TABLE_NAME END;
 IF NOT public.org_has_feature(org,feature) THEN RAISE EXCEPTION 'An active paid subscription is required'; END IF;
 RETURN COALESCE(NEW,OLD);
END $$;
CREATE TRIGGER zz_plan_guard BEFORE INSERT OR UPDATE OR DELETE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.operational_plan_guard();
CREATE TRIGGER zz_plan_guard BEFORE INSERT OR UPDATE OR DELETE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.operational_plan_guard();
CREATE TRIGGER zz_plan_guard BEFORE INSERT OR UPDATE OR DELETE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION public.operational_plan_guard();
CREATE TRIGGER zz_plan_guard BEFORE INSERT OR UPDATE OR DELETE ON public.delivery_routes FOR EACH ROW EXECUTE FUNCTION public.operational_plan_guard();
CREATE TRIGGER zz_plan_guard BEFORE INSERT OR UPDATE OR DELETE ON public.products FOR EACH ROW EXECUTE FUNCTION public.operational_plan_guard();
CREATE TRIGGER zz_plan_guard BEFORE INSERT OR UPDATE OR DELETE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.operational_plan_guard();
CREATE TRIGGER zz_plan_guard BEFORE INSERT OR UPDATE ON public.ai_transcriptions FOR EACH ROW EXECUTE FUNCTION public.operational_plan_guard();