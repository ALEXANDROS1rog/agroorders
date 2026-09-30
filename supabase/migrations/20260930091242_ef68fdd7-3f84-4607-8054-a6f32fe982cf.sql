ALTER TABLE public.delivery_routes
  ADD COLUMN IF NOT EXISTS total_order_value numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_expenses numeric GENERATED ALWAYS AS (coalesce(fuel,0)+coalesce(tolls,0)+coalesce(wear,0)+coalesce(food,0)) STORED,
  ADD COLUMN IF NOT EXISTS net_route_value numeric GENERATED ALWAYS AS (total_order_value-(coalesce(fuel,0)+coalesce(tolls,0)+coalesce(wear,0)+coalesce(food,0))) STORED;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_language text NOT NULL DEFAULT 'el';

ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS delivered_lat double precision,
  ADD COLUMN IF NOT EXISTS delivered_lng double precision,
  ADD COLUMN IF NOT EXISTS auto_confirmed boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.recalc_route_value(_route uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.delivery_routes r SET total_order_value = coalesce((
    SELECT sum(o.total) FROM public.orders o WHERE o.route_id = _route AND o.status <> 'cancelled'), 0)
  WHERE r.id = _route;
$$;
REVOKE ALL ON FUNCTION public.recalc_route_value(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.orders_route_value_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP IN ('INSERT','UPDATE') AND NEW.route_id IS NOT NULL THEN PERFORM public.recalc_route_value(NEW.route_id); END IF;
  IF TG_OP IN ('UPDATE','DELETE') AND OLD.route_id IS NOT NULL AND (TG_OP = 'DELETE' OR OLD.route_id IS DISTINCT FROM NEW.route_id) THEN
    PERFORM public.recalc_route_value(OLD.route_id);
  END IF;
  RETURN NULL;
END; $$;
REVOKE ALL ON FUNCTION public.orders_route_value_trigger() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS orders_route_value ON public.orders;
CREATE TRIGGER orders_route_value AFTER INSERT OR UPDATE OR DELETE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_route_value_trigger();

UPDATE public.delivery_routes r SET total_order_value = coalesce((SELECT sum(o.total) FROM public.orders o WHERE o.route_id = r.id AND o.status <> 'cancelled'),0);

CREATE OR REPLACE FUNCTION public.purge_old_history()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cutoff_ts timestamptz := now() - interval '2 months'; cutoff_d date := (now() - interval '2 months')::date;
BEGIN
  CREATE TEMP TABLE _old_orders ON COMMIT DROP AS
    SELECT o.id FROM public.orders o
    LEFT JOIN public.delivery_routes r ON r.id = o.route_id
    WHERE (o.route_id IS NULL AND o.order_date < cutoff_ts)
       OR (r.route_date IS NOT NULL AND r.route_date < cutoff_d);
  DELETE FROM public.ai_transcriptions WHERE order_id IN (SELECT id FROM _old_orders);
  DELETE FROM public.deliveries WHERE order_id IN (SELECT id FROM _old_orders);
  DELETE FROM public.order_items WHERE order_id IN (SELECT id FROM _old_orders);
  DELETE FROM public.orders WHERE id IN (SELECT id FROM _old_orders);
  DELETE FROM public.ai_transcriptions WHERE order_id IS NULL AND created_at < cutoff_ts;
  DELETE FROM public.delivery_routes WHERE route_date < cutoff_d;
END; $$;
REVOKE ALL ON FUNCTION public.purge_old_history() FROM PUBLIC, anon, authenticated;