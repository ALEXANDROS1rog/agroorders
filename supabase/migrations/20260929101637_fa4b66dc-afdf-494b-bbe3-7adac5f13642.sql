CREATE TABLE public.delivery_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  route_date date NOT NULL,
  fuel numeric NOT NULL DEFAULT 0,
  tolls numeric NOT NULL DEFAULT 0,
  wear numeric NOT NULL DEFAULT 0,
  food numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_routes TO authenticated;
GRANT ALL ON public.delivery_routes TO service_role;
ALTER TABLE public.delivery_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY delivery_routes_own ON public.delivery_routes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER delivery_routes_updated BEFORE UPDATE ON public.delivery_routes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX delivery_routes_user_date ON public.delivery_routes(user_id, route_date);

ALTER TABLE public.orders ADD COLUMN route_id uuid REFERENCES public.delivery_routes(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.purge_old_history()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.deliveries WHERE order_id IN (SELECT id FROM public.orders WHERE order_date < now() - interval '2 months');
  DELETE FROM public.order_items WHERE order_id IN (SELECT id FROM public.orders WHERE order_date < now() - interval '2 months');
  UPDATE public.ai_transcriptions SET order_id = NULL WHERE order_id IN (SELECT id FROM public.orders WHERE order_date < now() - interval '2 months');
  DELETE FROM public.orders WHERE order_date < now() - interval '2 months';
  DELETE FROM public.delivery_routes WHERE route_date < (now() - interval '2 months')::date;
END; $$;
REVOKE EXECUTE ON FUNCTION public.purge_old_history() FROM PUBLIC, anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('purge-old-history', '0 3 * * *', 'SELECT public.purge_old_history();');