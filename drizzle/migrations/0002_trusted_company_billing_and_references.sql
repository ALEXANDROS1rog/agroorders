ALTER TABLE public.organization_subscriptions ADD COLUMN IF NOT EXISTS payment_states jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.organization_subscriptions ADD COLUMN IF NOT EXISTS paid_confirmed boolean NOT NULL DEFAULT false;
ALTER TABLE public.organization_subscriptions ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false;
CREATE TABLE public.payment_events (environment text NOT NULL, event_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(environment,event_id));
GRANT ALL ON public.payment_events TO service_role;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.apply_company_payment(_env text, _event text, _org uuid, _state jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p uuid; prev jsonb;
BEGIN
 IF _env NOT IN ('sandbox','live') THEN RAISE EXCEPTION 'Invalid environment'; END IF;
 SELECT payment_states->_env INTO prev FROM public.organization_subscriptions WHERE organization_id=_org FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Unknown organization'; END IF;
 INSERT INTO public.payment_events(environment,event_id) VALUES(_env,_event) ON CONFLICT DO NOTHING;
 IF NOT FOUND THEN RETURN; END IF;
 SELECT id INTO p FROM public.subscription_plans WHERE stripe_price_id=_state->>'price_id';
 IF p IS NULL THEN RAISE EXCEPTION 'Unknown price'; END IF;
 UPDATE public.organization_subscriptions SET payment_states=jsonb_set(payment_states,ARRAY[_env],_state,true), updated_at=now() WHERE organization_id=_org;
 IF _env='live' THEN
 UPDATE public.organization_subscriptions SET plan_id=p, status=_state->>'status', stripe_subscription_id=_state->>'subscription_id', stripe_price_id=_state->>'price_id', current_period_start=(_state->>'period_start')::timestamptz, current_period_end=(_state->>'period_end')::timestamptz, paid_confirmed=COALESCE((_state->>'paid')::boolean,false), cancel_at_period_end=COALESCE((_state->>'cancel_at_period_end')::boolean,false) WHERE organization_id=_org;
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.apply_company_payment(text,text,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.apply_company_payment(text,text,uuid,jsonb) TO service_role;
CREATE OR REPLACE FUNCTION public.org_subscription_access(_org uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.is_org_member(_org) AND EXISTS(SELECT 1 FROM public.organization_subscriptions s WHERE s.organization_id=_org AND ((s.stripe_subscription_id IS NULL AND s.status IN ('active','trialing') AND (s.current_period_end IS NULL OR s.current_period_end>now())) OR (s.paid_confirmed AND s.status IN ('active','past_due','canceled') AND s.current_period_end>now())))
$$;
CREATE OR REPLACE FUNCTION public.org_has_feature(_org uuid,_feature text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.org_subscription_access(_org) AND EXISTS(SELECT 1 FROM public.organization_subscriptions s JOIN public.subscription_plans p ON p.id=s.plan_id WHERE s.organization_id=_org AND p.active AND p.features ? _feature)
$$;
CREATE OR REPLACE FUNCTION public.my_org_context() RETURNS TABLE(organization_id uuid,organization_name text,role text,plan_slug text,plan_name text,max_users integer,active_users integer,pending_invites integer,subscription_status text,features jsonb,permissions text[]) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 WITH o AS(SELECT public.current_org() id)
 SELECT org.id,org.name,m.role,p.slug,p.name,p.max_users,(SELECT count(*) FROM public.organization_members WHERE organization_id=org.id AND status='active')::int,(SELECT count(*) FROM public.organization_invitations WHERE organization_id=org.id AND status='pending' AND expires_at>now())::int,s.status,CASE WHEN public.org_subscription_access(org.id) THEN COALESCE(p.features,'[]'::jsonb) ELSE '[]'::jsonb END,ARRAY(SELECT rp.permission FROM public.role_permissions rp WHERE rp.role=m.role)
 FROM o JOIN public.organizations org ON org.id=o.id JOIN public.organization_members m ON m.organization_id=org.id AND m.user_id=auth.uid() AND m.status='active' LEFT JOIN public.organization_subscriptions s ON s.organization_id=org.id LEFT JOIN public.subscription_plans p ON p.id=s.plan_id
$$;
ALTER POLICY subs_view ON public.organization_subscriptions USING(public.has_org_permission(organization_id,'billing.manage'));
ALTER POLICY members_view ON public.organization_members USING(public.has_org_permission(organization_id,'members.manage') OR public.org_role(organization_id)='manager' OR user_id=auth.uid());
CREATE OR REPLACE FUNCTION public.company_reference_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF TG_OP='UPDATE' AND NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN RAISE EXCEPTION 'Company cannot change'; END IF;
 IF TG_TABLE_NAME='orders' THEN
 IF NEW.customer_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.customers WHERE id=NEW.customer_id AND organization_id=NEW.organization_id) THEN RAISE EXCEPTION 'Customer belongs to another company'; END IF;
 IF NEW.route_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.delivery_routes WHERE id=NEW.route_id AND organization_id=NEW.organization_id) THEN RAISE EXCEPTION 'Route belongs to another company'; END IF;
 ELSIF TG_TABLE_NAME IN ('order_items','deliveries') THEN
 IF NOT EXISTS(SELECT 1 FROM public.orders WHERE id=NEW.order_id AND organization_id=NEW.organization_id) THEN RAISE EXCEPTION 'Order belongs to another company'; END IF;
 IF TG_TABLE_NAME='order_items' THEN
 IF NEW.product_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.products WHERE id=NEW.product_id AND organization_id=NEW.organization_id) THEN RAISE EXCEPTION 'Product belongs to another company'; END IF;
 END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER z_company_reference_guard BEFORE INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.company_reference_guard();
CREATE TRIGGER z_company_reference_guard BEFORE INSERT OR UPDATE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.company_reference_guard();
CREATE TRIGGER z_company_reference_guard BEFORE INSERT OR UPDATE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION public.company_reference_guard();
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE new_org uuid; selected uuid;
BEGIN
 INSERT INTO public.profiles(id,first_name,last_name,business_name,phone,email) VALUES(NEW.id,COALESCE(NEW.raw_user_meta_data->>'first_name',''),COALESCE(NEW.raw_user_meta_data->>'last_name',''),COALESCE(NEW.raw_user_meta_data->>'business_name',''),COALESCE(NEW.raw_user_meta_data->>'phone',''),COALESCE(NEW.email,'')) ON CONFLICT(id) DO NOTHING;
 IF NOT EXISTS(SELECT 1 FROM public.organization_invitations WHERE email=lower(NEW.email) AND status='pending' AND expires_at>now()) THEN
 SELECT id INTO selected FROM public.subscription_plans WHERE slug=COALESCE(NEW.raw_user_meta_data->>'selected_plan','basic') AND active;
 IF selected IS NULL THEN SELECT id INTO selected FROM public.subscription_plans WHERE slug='basic'; END IF;
 INSERT INTO public.organizations(name,owner_id) VALUES(COALESCE(NULLIF(NEW.raw_user_meta_data->>'business_name',''),'Επιχείρηση'),NEW.id) RETURNING id INTO new_org;
 INSERT INTO public.organization_members(organization_id,user_id,role) VALUES(new_org,NEW.id,'owner');
 INSERT INTO public.organization_subscriptions(organization_id,plan_id,status) VALUES(new_org,selected,'unpaid');
 UPDATE public.profiles SET active_organization_id=new_org WHERE id=NEW.id;
 END IF;
 RETURN NEW;
END $$;