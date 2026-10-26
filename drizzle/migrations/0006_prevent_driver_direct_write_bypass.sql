CREATE OR REPLACE FUNCTION public.driver_write_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL THEN RETURN NEW; END IF;
 IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN RAISE EXCEPTION 'Company cannot change'; END IF;
 IF public.org_role(OLD.organization_id)='driver' THEN
 IF NOT public.can_access_order(CASE WHEN TG_TABLE_NAME='orders' THEN OLD.id ELSE OLD.order_id END) THEN RAISE EXCEPTION 'Delivery not assigned'; END IF;
 IF TG_TABLE_NAME='orders' AND NEW.status NOT IN ('delivering','delivered') AND NEW.status IS DISTINCT FROM OLD.status THEN RAISE EXCEPTION 'Unauthorized driver status'; END IF;
 IF TG_TABLE_NAME='deliveries' THEN
 IF NEW.status NOT IN ('in_progress','delivered') AND NEW.status IS DISTINCT FROM OLD.status THEN RAISE EXCEPTION 'Unauthorized driver status'; END IF;
 IF NEW.order_id IS DISTINCT FROM OLD.order_id OR NEW.route_position IS DISTINCT FROM OLD.route_position OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN RAISE EXCEPTION 'Unauthorized delivery change'; END IF;
 END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER z_driver_write_guard BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.driver_write_guard();
CREATE TRIGGER z_driver_write_guard BEFORE UPDATE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION public.driver_write_guard();
CREATE TRIGGER z_company_reference_guard BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.company_reference_guard();
CREATE TRIGGER z_company_reference_guard BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.company_reference_guard();
CREATE TRIGGER z_company_reference_guard BEFORE UPDATE ON public.delivery_routes FOR EACH ROW EXECUTE FUNCTION public.company_reference_guard();