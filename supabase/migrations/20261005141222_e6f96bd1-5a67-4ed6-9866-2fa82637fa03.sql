-- ===== Core tables =====
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  owner_id uuid NOT NULL,
  stripe_customer_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('owner','manager','driver')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','removed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);
CREATE INDEX organization_members_user_idx ON public.organization_members(user_id);
CREATE TABLE public.organization_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('manager','driver')),
  token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','expired','cancelled')),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days',
  invited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz
);
CREATE UNIQUE INDEX organization_invitations_pending_email ON public.organization_invitations(organization_id, lower(email)) WHERE status = 'pending';
CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  price numeric NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  billing_interval text NOT NULL DEFAULT 'year',
  max_users integer NOT NULL,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  stripe_price_id text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.organization_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id),
  status text NOT NULL DEFAULT 'unpaid',
  current_period_start timestamptz,
  current_period_end timestamptz,
  stripe_subscription_id text,
  stripe_price_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.organization_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_id uuid,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.role_permissions (
  role text NOT NULL,
  permission text NOT NULL,
  PRIMARY KEY (role, permission)
);

GRANT SELECT ON public.organizations, public.organization_members, public.subscription_plans, public.organization_subscriptions, public.organization_activity, public.role_permissions TO authenticated;
GRANT UPDATE ON public.organizations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.organization_invitations TO authenticated;
GRANT SELECT ON public.subscription_plans TO anon;
GRANT ALL ON public.organizations, public.organization_members, public.organization_invitations, public.subscription_plans, public.organization_subscriptions, public.organization_activity, public.role_permissions TO service_role;

INSERT INTO public.subscription_plans (slug, name, price, max_users, sort_order, features) VALUES
 ('basic','BASIC',300,2,1,'["orders","customers","products","routes","deliveries","voice_ai"]'),
 ('pro','PRO',450,5,2,'["orders","customers","products","routes","deliveries","voice_ai","advanced_routes","gps_delivery","auto_arrival","advanced_finance","advanced_deliveries"]'),
 ('business','BUSINESS',600,10,3,'["orders","customers","products","routes","deliveries","voice_ai","advanced_routes","gps_delivery","auto_arrival","advanced_finance","advanced_deliveries","advanced_permissions","advanced_analytics","advanced_ai","advanced_org"]');

INSERT INTO public.role_permissions (role, permission) VALUES
 ('owner','org.manage'),('owner','members.manage'),('owner','billing.manage'),('owner','finance.view'),
 ('owner','products.manage'),('owner','products.view'),('owner','customers.manage'),('owner','customers.create'),('owner','customers.view'),
 ('owner','orders.manage'),('owner','orders.create'),('owner','orders.view'),('owner','orders.status'),
 ('owner','routes.manage'),('owner','routes.view'),('owner','deliveries.view'),('owner','deliveries.update'),
 ('manager','finance.view'),('manager','products.manage'),('manager','products.view'),('manager','customers.manage'),('manager','customers.create'),('manager','customers.view'),
 ('manager','orders.manage'),('manager','orders.create'),('manager','orders.view'),('manager','orders.status'),
 ('manager','routes.manage'),('manager','routes.view'),('manager','deliveries.view'),('manager','deliveries.update'),
 ('driver','products.view'),('driver','customers.view'),('driver','customers.create'),('driver','orders.view'),('driver','orders.create'),('driver','orders.status'),
 ('driver','routes.view'),('driver','deliveries.view'),('driver','deliveries.update');

ALTER TABLE public.profiles ADD COLUMN active_organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

-- ===== Helper functions (security definer, avoid RLS recursion) =====
CREATE OR REPLACE FUNCTION public.is_org_member(_org uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = _org AND user_id = auth.uid() AND status = 'active')
$$;
CREATE OR REPLACE FUNCTION public.org_role(_org uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.organization_members WHERE organization_id = _org AND user_id = auth.uid() AND status = 'active'
$$;
CREATE OR REPLACE FUNCTION public.has_org_permission(_org uuid, _perm text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members m JOIN public.role_permissions p ON p.role = m.role
    WHERE m.organization_id = _org AND m.user_id = auth.uid() AND m.status = 'active' AND p.permission = _perm)
$$;
CREATE OR REPLACE FUNCTION public.org_has_feature(_org uuid, _feature text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_subscriptions s JOIN public.subscription_plans p ON p.id = s.plan_id
    WHERE s.organization_id = _org AND p.features ? _feature)
$$;
CREATE OR REPLACE FUNCTION public.current_org() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT p.active_organization_id FROM public.profiles p WHERE p.id = auth.uid() AND public.is_org_member(p.active_organization_id)),
    (SELECT m.organization_id FROM public.organization_members m WHERE m.user_id = auth.uid() AND m.status = 'active' ORDER BY m.created_at LIMIT 1))
$$;
CREATE OR REPLACE FUNCTION public.org_seats_used(_org uuid) RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (SELECT count(*) FROM public.organization_members WHERE organization_id = _org AND status = 'active')::int
       + (SELECT count(*) FROM public.organization_invitations WHERE organization_id = _org AND status = 'pending' AND expires_at > now())::int
$$;
CREATE OR REPLACE FUNCTION public.org_max_users(_org uuid) RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT p.max_users FROM public.organization_subscriptions s JOIN public.subscription_plans p ON p.id = s.plan_id WHERE s.organization_id = _org), 0)
$$;

-- ===== Organization data columns + backfill =====
DO $$
DECLARE u record; new_org uuid; biz uuid := (SELECT id FROM public.subscription_plans WHERE slug = 'business');
BEGIN
  FOR u IN SELECT id, business_name, first_name, last_name FROM public.profiles LOOP
    INSERT INTO public.organizations (name, owner_id)
      VALUES (COALESCE(NULLIF(u.business_name,''), NULLIF(trim(u.first_name || ' ' || u.last_name),''), 'Επιχείρηση'), u.id)
      RETURNING id INTO new_org;
    INSERT INTO public.organization_members (organization_id, user_id, role) VALUES (new_org, u.id, 'owner');
    INSERT INTO public.organization_subscriptions (organization_id, plan_id, status) VALUES (new_org, biz, 'legacy');
    UPDATE public.profiles SET active_organization_id = new_org WHERE id = u.id;
  END LOOP;
END $$;

ALTER TABLE public.products ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.customers ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.orders ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.order_items ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.deliveries ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.delivery_routes ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.ai_transcriptions ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

UPDATE public.products t SET organization_id = p.active_organization_id FROM public.profiles p WHERE p.id = t.user_id;
UPDATE public.customers t SET organization_id = p.active_organization_id FROM public.profiles p WHERE p.id = t.user_id;
UPDATE public.orders t SET organization_id = p.active_organization_id FROM public.profiles p WHERE p.id = t.user_id;
UPDATE public.order_items t SET organization_id = p.active_organization_id FROM public.profiles p WHERE p.id = t.user_id;
UPDATE public.deliveries t SET organization_id = p.active_organization_id FROM public.profiles p WHERE p.id = t.user_id;
UPDATE public.delivery_routes t SET organization_id = p.active_organization_id FROM public.profiles p WHERE p.id = t.user_id;
UPDATE public.ai_transcriptions t SET organization_id = p.active_organization_id FROM public.profiles p WHERE p.id = t.user_id;

CREATE INDEX products_org_idx ON public.products(organization_id);
CREATE INDEX customers_org_idx ON public.customers(organization_id);
CREATE INDEX orders_org_idx ON public.orders(organization_id);
CREATE INDEX order_items_org_idx ON public.order_items(organization_id);
CREATE INDEX deliveries_org_idx ON public.deliveries(organization_id);
CREATE INDEX delivery_routes_org_idx ON public.delivery_routes(organization_id);
CREATE INDEX ai_transcriptions_org_idx ON public.ai_transcriptions(organization_id);

DROP INDEX IF EXISTS public.customers_user_phone_key;
CREATE UNIQUE INDEX customers_org_phone_key ON public.customers(organization_id, phone) WHERE phone <> '';

-- Organization is always taken from the signed-in user's membership, never from the app.
CREATE OR REPLACE FUNCTION public.set_row_org() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    IF NEW.organization_id IS NULL THEN RAISE EXCEPTION 'organization required'; END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.organization_id := public.current_org();
    NEW.user_id := auth.uid();
    IF NEW.organization_id IS NULL THEN RAISE EXCEPTION 'Δεν ανήκετε σε επιχείρηση.'; END IF;
  ELSE
    NEW.organization_id := OLD.organization_id;
    NEW.user_id := OLD.user_id;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER aa_set_org BEFORE INSERT OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_row_org();
CREATE TRIGGER aa_set_org BEFORE INSERT OR UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.set_row_org();
CREATE TRIGGER aa_set_org BEFORE INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_row_org();
CREATE TRIGGER aa_set_org BEFORE INSERT OR UPDATE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.set_row_org();
CREATE TRIGGER aa_set_org BEFORE INSERT OR UPDATE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION public.set_row_org();
CREATE TRIGGER aa_set_org BEFORE INSERT OR UPDATE ON public.delivery_routes FOR EACH ROW EXECUTE FUNCTION public.set_row_org();
CREATE TRIGGER aa_set_org BEFORE INSERT OR UPDATE ON public.ai_transcriptions FOR EACH ROW EXECUTE FUNCTION public.set_row_org();

-- Order numbers are now shared per business.
CREATE OR REPLACE FUNCTION public.assign_order_number() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = 0 THEN
    SELECT COALESCE(MAX(order_number), 0) + 1 INTO NEW.order_number FROM public.orders WHERE organization_id = NEW.organization_id;
  END IF;
  RETURN NEW;
END $$;

-- Drivers may only change an order's status.
CREATE OR REPLACE FUNCTION public.orders_role_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_org_permission(OLD.organization_id, 'orders.manage') THEN RETURN NEW; END IF;
  IF NEW.customer_id IS DISTINCT FROM OLD.customer_id OR NEW.address IS DISTINCT FROM OLD.address OR NEW.phone IS DISTINCT FROM OLD.phone
     OR NEW.notes IS DISTINCT FROM OLD.notes OR NEW.route_id IS DISTINCT FROM OLD.route_id OR NEW.order_date IS DISTINCT FROM OLD.order_date
     OR (NEW.total IS DISTINCT FROM OLD.total AND current_setting('voiceorders.recalc', true) IS DISTINCT FROM 'on') THEN
    RAISE EXCEPTION 'Δεν έχετε δικαίωμα να αλλάξετε αυτή την παραγγελία.';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER ab_role_guard BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.orders_role_guard();

CREATE OR REPLACE FUNCTION public.recalc_order_total() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE target uuid;
BEGIN
  target := COALESCE(NEW.order_id, OLD.order_id);
  PERFORM set_config('voiceorders.recalc', 'on', true);
  UPDATE public.orders o SET total = COALESCE((SELECT SUM(i.unit_price * i.quantity) FROM public.order_items i WHERE i.order_id = target), 0) WHERE o.id = target;
  PERFORM set_config('voiceorders.recalc', 'off', true);
  RETURN NULL;
END $$;

-- Automatic arrival confirmation is a plan feature.
CREATE OR REPLACE FUNCTION public.deliveries_feature_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.auto_confirmed AND NOT COALESCE(OLD.auto_confirmed, false) AND auth.uid() IS NOT NULL
     AND NOT public.org_has_feature(NEW.organization_id, 'auto_arrival') THEN
    RAISE EXCEPTION 'Η αυτόματη επιβεβαίωση άφιξης δεν περιλαμβάνεται στο πλάνο σας.';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER ab_feature_guard BEFORE UPDATE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION public.deliveries_feature_guard();

-- ===== Replace per-user policies with organization policies =====
DROP POLICY IF EXISTS products_own ON public.products;
DROP POLICY IF EXISTS customers_own ON public.customers;
DROP POLICY IF EXISTS orders_own ON public.orders;
DROP POLICY IF EXISTS order_items_own ON public.order_items;
DROP POLICY IF EXISTS deliveries_own ON public.deliveries;
DROP POLICY IF EXISTS delivery_routes_own ON public.delivery_routes;
DROP POLICY IF EXISTS ai_transcriptions_own ON public.ai_transcriptions;

CREATE POLICY products_view ON public.products FOR SELECT TO authenticated USING (public.has_org_permission(organization_id, 'products.view'));
CREATE POLICY products_insert ON public.products FOR INSERT TO authenticated WITH CHECK (public.has_org_permission(organization_id, 'products.manage'));
CREATE POLICY products_update ON public.products FOR UPDATE TO authenticated USING (public.has_org_permission(organization_id, 'products.manage')) WITH CHECK (public.has_org_permission(organization_id, 'products.manage'));
CREATE POLICY products_delete ON public.products FOR DELETE TO authenticated USING (public.has_org_permission(organization_id, 'products.manage'));

CREATE POLICY customers_view ON public.customers FOR SELECT TO authenticated USING (public.has_org_permission(organization_id, 'customers.view'));
CREATE POLICY customers_insert ON public.customers FOR INSERT TO authenticated WITH CHECK (public.has_org_permission(organization_id, 'customers.create'));
CREATE POLICY customers_update ON public.customers FOR UPDATE TO authenticated USING (public.has_org_permission(organization_id, 'customers.manage')) WITH CHECK (public.has_org_permission(organization_id, 'customers.manage'));
CREATE POLICY customers_delete ON public.customers FOR DELETE TO authenticated USING (public.has_org_permission(organization_id, 'customers.manage'));

CREATE POLICY orders_view ON public.orders FOR SELECT TO authenticated USING (public.has_org_permission(organization_id, 'orders.view'));
CREATE POLICY orders_insert ON public.orders FOR INSERT TO authenticated WITH CHECK (public.has_org_permission(organization_id, 'orders.create'));
CREATE POLICY orders_update ON public.orders FOR UPDATE TO authenticated USING (public.has_org_permission(organization_id, 'orders.status')) WITH CHECK (public.has_org_permission(organization_id, 'orders.status'));
CREATE POLICY orders_delete ON public.orders FOR DELETE TO authenticated USING (public.has_org_permission(organization_id, 'orders.manage'));

CREATE POLICY order_items_view ON public.order_items FOR SELECT TO authenticated USING (public.has_org_permission(organization_id, 'orders.view'));
CREATE POLICY order_items_insert ON public.order_items FOR INSERT TO authenticated WITH CHECK (public.has_org_permission(organization_id, 'orders.manage')
  OR (public.has_org_permission(organization_id, 'orders.create') AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid() AND o.created_at > now() - interval '10 minutes')));
CREATE POLICY order_items_update ON public.order_items FOR UPDATE TO authenticated USING (public.has_org_permission(organization_id, 'orders.manage')) WITH CHECK (public.has_org_permission(organization_id, 'orders.manage'));
CREATE POLICY order_items_delete ON public.order_items FOR DELETE TO authenticated USING (public.has_org_permission(organization_id, 'orders.manage'));

CREATE POLICY deliveries_view ON public.deliveries FOR SELECT TO authenticated USING (public.has_org_permission(organization_id, 'deliveries.view'));
CREATE POLICY deliveries_insert ON public.deliveries FOR INSERT TO authenticated WITH CHECK (public.has_org_permission(organization_id, 'orders.create'));
CREATE POLICY deliveries_update ON public.deliveries FOR UPDATE TO authenticated USING (public.has_org_permission(organization_id, 'deliveries.update')) WITH CHECK (public.has_org_permission(organization_id, 'deliveries.update'));
CREATE POLICY deliveries_delete ON public.deliveries FOR DELETE TO authenticated USING (public.has_org_permission(organization_id, 'orders.manage'));

CREATE POLICY routes_view ON public.delivery_routes FOR SELECT TO authenticated USING (public.has_org_permission(organization_id, 'routes.view'));
CREATE POLICY routes_insert ON public.delivery_routes FOR INSERT TO authenticated WITH CHECK (public.has_org_permission(organization_id, 'routes.manage'));
CREATE POLICY routes_update ON public.delivery_routes FOR UPDATE TO authenticated USING (public.has_org_permission(organization_id, 'routes.manage')) WITH CHECK (public.has_org_permission(organization_id, 'routes.manage'));
CREATE POLICY routes_delete ON public.delivery_routes FOR DELETE TO authenticated USING (public.has_org_permission(organization_id, 'routes.manage'));

CREATE POLICY ai_transcriptions_view ON public.ai_transcriptions FOR SELECT TO authenticated USING (public.has_org_permission(organization_id, 'orders.manage') OR (user_id = auth.uid() AND public.is_org_member(organization_id)));
CREATE POLICY ai_transcriptions_insert ON public.ai_transcriptions FOR INSERT TO authenticated WITH CHECK (public.has_org_permission(organization_id, 'orders.create'));
CREATE POLICY ai_transcriptions_update ON public.ai_transcriptions FOR UPDATE TO authenticated USING (user_id = auth.uid() AND public.is_org_member(organization_id)) WITH CHECK (user_id = auth.uid() AND public.is_org_member(organization_id));

-- ===== Policies for new tables =====
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_view ON public.organizations FOR SELECT TO authenticated USING (public.is_org_member(id));
CREATE POLICY org_update ON public.organizations FOR UPDATE TO authenticated USING (public.has_org_permission(id, 'org.manage')) WITH CHECK (public.has_org_permission(id, 'org.manage'));
CREATE POLICY members_view ON public.organization_members FOR SELECT TO authenticated USING (public.is_org_member(organization_id) OR user_id = auth.uid());
CREATE POLICY invites_view ON public.organization_invitations FOR SELECT TO authenticated USING (public.has_org_permission(organization_id, 'members.manage'));
CREATE POLICY invites_insert ON public.organization_invitations FOR INSERT TO authenticated WITH CHECK (public.has_org_permission(organization_id, 'members.manage'));
CREATE POLICY invites_update ON public.organization_invitations FOR UPDATE TO authenticated USING (public.has_org_permission(organization_id, 'members.manage')) WITH CHECK (public.has_org_permission(organization_id, 'members.manage'));
CREATE POLICY plans_view ON public.subscription_plans FOR SELECT TO anon, authenticated USING (active);
CREATE POLICY subs_view ON public.organization_subscriptions FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY activity_view ON public.organization_activity FOR SELECT TO authenticated USING (public.has_org_permission(organization_id, 'members.manage'));
CREATE POLICY role_permissions_view ON public.role_permissions FOR SELECT TO authenticated USING (true);

-- Seat limit (active members + pending invitations), checked on every new invitation / member.
CREATE OR REPLACE FUNCTION public.invites_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.email := lower(trim(NEW.email));
  NEW.invited_by := COALESCE(auth.uid(), NEW.invited_by);
  NEW.status := 'pending'; NEW.accepted_at := NULL;
  UPDATE public.organization_invitations SET status = 'expired' WHERE organization_id = NEW.organization_id AND status = 'pending' AND expires_at <= now();
  IF EXISTS (SELECT 1 FROM public.organization_members m JOIN auth.users u ON u.id = m.user_id
             WHERE m.organization_id = NEW.organization_id AND m.status = 'active' AND lower(u.email) = NEW.email) THEN
    RAISE EXCEPTION 'Αυτό το email είναι ήδη μέλος της επιχείρησης.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.organization_invitations WHERE organization_id = NEW.organization_id AND status = 'pending' AND email = NEW.email) THEN
    RAISE EXCEPTION 'Υπάρχει ήδη πρόσκληση για αυτό το email.';
  END IF;
  IF public.org_seats_used(NEW.organization_id) >= public.org_max_users(NEW.organization_id) THEN
    RAISE EXCEPTION 'Φτάσατε τον μέγιστο αριθμό χρηστών του πλάνου σας.';
  END IF;
  INSERT INTO public.organization_activity (organization_id, actor_id, action, details) VALUES (NEW.organization_id, auth.uid(), 'member_invited', jsonb_build_object('email', NEW.email, 'role', NEW.role));
  RETURN NEW;
END $$;
CREATE TRIGGER invites_guard BEFORE INSERT ON public.organization_invitations FOR EACH ROW EXECUTE FUNCTION public.invites_guard();

-- Invitations may only be cancelled from the app.
CREATE OR REPLACE FUNCTION public.invites_update_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND current_setting('voiceorders.accepting', true) IS DISTINCT FROM 'on' THEN
    IF NEW.status <> 'cancelled' OR OLD.status <> 'pending' OR NEW.email <> OLD.email OR NEW.role <> OLD.role OR NEW.token <> OLD.token OR NEW.organization_id <> OLD.organization_id THEN
      RAISE EXCEPTION 'Μη επιτρεπτή αλλαγή πρόσκλησης.';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER invites_update_guard BEFORE UPDATE ON public.organization_invitations FOR EACH ROW EXECUTE FUNCTION public.invites_update_guard();

-- Organization name changes only (owner protected).
CREATE OR REPLACE FUNCTION public.org_update_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN NEW.owner_id := OLD.owner_id; NEW.stripe_customer_id := OLD.stripe_customer_id; END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER org_update_guard BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.org_update_guard();

-- ===== RPCs =====
CREATE OR REPLACE FUNCTION public.get_invitation(_token uuid)
RETURNS TABLE (organization_name text, email text, role text, status text, expired boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT o.name, i.email, i.role, i.status, i.expires_at <= now()
  FROM public.organization_invitations i JOIN public.organizations o ON o.id = i.organization_id WHERE i.token = _token
$$;

CREATE OR REPLACE FUNCTION public.my_invitations()
RETURNS TABLE (token uuid, organization_name text, role text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT i.token, o.name, i.role FROM public.organization_invitations i JOIN public.organizations o ON o.id = i.organization_id
  WHERE i.status = 'pending' AND i.expires_at > now() AND i.email = lower((SELECT email FROM auth.users WHERE id = auth.uid()))
$$;

CREATE OR REPLACE FUNCTION public.accept_invitation(_token uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inv record; my_email text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Χρειάζεται σύνδεση.'; END IF;
  SELECT lower(email) INTO my_email FROM auth.users WHERE id = auth.uid();
  SELECT * INTO inv FROM public.organization_invitations WHERE token = _token FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Η πρόσκληση δεν βρέθηκε.'; END IF;
  IF inv.status <> 'pending' THEN RAISE EXCEPTION 'Η πρόσκληση δεν είναι πλέον ενεργή.'; END IF;
  IF inv.expires_at <= now() THEN
    UPDATE public.organization_invitations SET status = 'expired' WHERE id = inv.id;
    RAISE EXCEPTION 'Η πρόσκληση έληξε.';
  END IF;
  IF inv.email <> my_email THEN RAISE EXCEPTION 'Η πρόσκληση είναι για άλλο email (%).', inv.email; END IF;
  -- The pending invitation already holds a seat, so this never exceeds the plan.
  INSERT INTO public.organization_members (organization_id, user_id, role, status) VALUES (inv.organization_id, auth.uid(), inv.role, 'active')
    ON CONFLICT (organization_id, user_id) DO UPDATE SET role = EXCLUDED.role, status = 'active', updated_at = now();
  PERFORM set_config('voiceorders.accepting', 'on', true);
  UPDATE public.organization_invitations SET status = 'accepted', accepted_at = now() WHERE id = inv.id;
  PERFORM set_config('voiceorders.accepting', 'off', true);
  UPDATE public.profiles SET active_organization_id = inv.organization_id WHERE id = auth.uid();
  INSERT INTO public.organization_activity (organization_id, actor_id, action, details) VALUES (inv.organization_id, auth.uid(), 'invitation_accepted', jsonb_build_object('email', my_email, 'role', inv.role));
  RETURN inv.organization_id;
END $$;

CREATE OR REPLACE FUNCTION public.org_members_list()
RETURNS TABLE (member_id uuid, user_id uuid, full_name text, email text, role text, status text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.id, m.user_id, trim(p.first_name || ' ' || p.last_name), COALESCE(NULLIF(p.email,''), u.email), m.role, m.status, m.created_at
  FROM public.organization_members m LEFT JOIN public.profiles p ON p.id = m.user_id LEFT JOIN auth.users u ON u.id = m.user_id
  WHERE m.organization_id = public.current_org() AND m.status = 'active' AND public.is_org_member(m.organization_id)
  ORDER BY CASE m.role WHEN 'owner' THEN 0 WHEN 'manager' THEN 1 ELSE 2 END, m.created_at
$$;

CREATE OR REPLACE FUNCTION public.change_member_role(_member uuid, _role text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m record;
BEGIN
  SELECT * INTO m FROM public.organization_members WHERE id = _member;
  IF NOT FOUND OR NOT public.has_org_permission(m.organization_id, 'members.manage') THEN RAISE EXCEPTION 'Δεν έχετε δικαίωμα.'; END IF;
  IF m.role = 'owner' OR _role NOT IN ('manager','driver') THEN RAISE EXCEPTION 'Ο ρόλος του ιδιοκτήτη δεν αλλάζει.'; END IF;
  UPDATE public.organization_members SET role = _role, updated_at = now() WHERE id = _member;
  INSERT INTO public.organization_activity (organization_id, actor_id, action, details) VALUES (m.organization_id, auth.uid(), 'role_changed', jsonb_build_object('user_id', m.user_id, 'from', m.role, 'to', _role));
END $$;

CREATE OR REPLACE FUNCTION public.remove_member(_member uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m record;
BEGIN
  SELECT * INTO m FROM public.organization_members WHERE id = _member;
  IF NOT FOUND OR NOT public.has_org_permission(m.organization_id, 'members.manage') THEN RAISE EXCEPTION 'Δεν έχετε δικαίωμα.'; END IF;
  IF m.role = 'owner' THEN RAISE EXCEPTION 'Ο ιδιοκτήτης δεν μπορεί να αφαιρεθεί.'; END IF;
  UPDATE public.organization_members SET status = 'removed', updated_at = now() WHERE id = _member;
  INSERT INTO public.organization_activity (organization_id, actor_id, action, details) VALUES (m.organization_id, auth.uid(), 'member_removed', jsonb_build_object('user_id', m.user_id));
END $$;

CREATE OR REPLACE FUNCTION public.my_org_context()
RETURNS TABLE (organization_id uuid, organization_name text, role text, plan_slug text, plan_name text, max_users integer, active_users integer, pending_invites integer, subscription_status text, features jsonb, permissions text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH o AS (SELECT public.current_org() AS id)
  SELECT org.id, org.name, m.role, p.slug, p.name, p.max_users,
    (SELECT count(*) FROM public.organization_members WHERE organization_id = org.id AND status = 'active')::int,
    (SELECT count(*) FROM public.organization_invitations WHERE organization_id = org.id AND status = 'pending' AND expires_at > now())::int,
    s.status, COALESCE(p.features, '[]'::jsonb),
    ARRAY(SELECT rp.permission FROM public.role_permissions rp WHERE rp.role = m.role)
  FROM o JOIN public.organizations org ON org.id = o.id
  JOIN public.organization_members m ON m.organization_id = org.id AND m.user_id = auth.uid() AND m.status = 'active'
  LEFT JOIN public.organization_subscriptions s ON s.organization_id = org.id
  LEFT JOIN public.subscription_plans p ON p.id = s.plan_id
$$;

REVOKE EXECUTE ON FUNCTION public.get_invitation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invitation(uuid) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.my_invitations(), public.accept_invitation(uuid), public.org_members_list(), public.change_member_role(uuid, text), public.remove_member(uuid), public.my_org_context() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_invitations(), public.accept_invitation(uuid), public.org_members_list(), public.change_member_role(uuid, text), public.remove_member(uuid), public.my_org_context() TO authenticated;

-- ===== New sign-ups: own business on BASIC, unless they were invited =====
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_org uuid;
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, business_name, phone, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'first_name', ''), COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
          COALESCE(NEW.raw_user_meta_data->>'business_name', ''), COALESCE(NEW.raw_user_meta_data->>'phone', ''), COALESCE(NEW.email, ''))
  ON CONFLICT (id) DO NOTHING;
  IF NOT EXISTS (SELECT 1 FROM public.organization_invitations WHERE email = lower(NEW.email) AND status = 'pending' AND expires_at > now()) THEN
    INSERT INTO public.organizations (name, owner_id)
      VALUES (COALESCE(NULLIF(NEW.raw_user_meta_data->>'business_name',''), 'Επιχείρηση'), NEW.id) RETURNING id INTO new_org;
    INSERT INTO public.organization_members (organization_id, user_id, role) VALUES (new_org, NEW.id, 'owner');
    INSERT INTO public.organization_subscriptions (organization_id, plan_id, status)
      VALUES (new_org, (SELECT id FROM public.subscription_plans WHERE slug = 'basic'), 'unpaid');
    UPDATE public.profiles SET active_organization_id = new_org WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END $$;