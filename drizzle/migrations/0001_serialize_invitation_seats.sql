CREATE OR REPLACE FUNCTION public.invites_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  -- Serialize seat reservations for each organization across concurrent requests.
  PERFORM 1 FROM public.organizations WHERE id = NEW.organization_id FOR UPDATE;
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
END $function$;
CREATE OR REPLACE FUNCTION public.accept_invitation(_token uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE inv record; my_email text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Χρειάζεται σύνδεση.'; END IF;
  SELECT lower(email) INTO my_email FROM auth.users WHERE id = auth.uid();
  SELECT * INTO inv FROM public.organization_invitations WHERE token = _token;
  IF NOT FOUND THEN RAISE EXCEPTION 'Η πρόσκληση δεν βρέθηκε.'; END IF;
  PERFORM 1 FROM public.organizations WHERE id = inv.organization_id FOR UPDATE;
  SELECT * INTO inv FROM public.organization_invitations WHERE token = _token FOR UPDATE;
  IF inv.status <> 'pending' THEN RAISE EXCEPTION 'Η πρόσκληση δεν είναι πλέον ενεργή.'; END IF;
  IF inv.expires_at <= now() THEN RAISE EXCEPTION 'Η πρόσκληση έληξε.'; END IF;
  IF inv.email <> my_email THEN RAISE EXCEPTION 'Η πρόσκληση είναι για άλλο email (%).', inv.email; END IF;
  IF EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = inv.organization_id AND user_id = auth.uid() AND status = 'active') THEN
    RAISE EXCEPTION 'Αυτό το email είναι ήδη μέλος της επιχείρησης.';
  END IF;
  IF public.org_seats_used(inv.organization_id) > public.org_max_users(inv.organization_id) THEN
    RAISE EXCEPTION 'Φτάσατε τον μέγιστο αριθμό χρηστών του πλάνου σας.';
  END IF;
  INSERT INTO public.organization_members (organization_id, user_id, role, status) VALUES (inv.organization_id, auth.uid(), inv.role, 'active')
    ON CONFLICT (organization_id, user_id) DO UPDATE SET role = EXCLUDED.role, status = 'active', updated_at = now();
  PERFORM set_config('voiceorders.accepting', 'on', true);
  UPDATE public.organization_invitations SET status = 'accepted', accepted_at = now() WHERE id = inv.id;
  PERFORM set_config('voiceorders.accepting', 'off', true);
  UPDATE public.profiles SET active_organization_id = inv.organization_id WHERE id = auth.uid();
  INSERT INTO public.organization_activity (organization_id, actor_id, action, details) VALUES (inv.organization_id, auth.uid(), 'invitation_accepted', jsonb_build_object('email', my_email, 'role', inv.role));
  RETURN inv.organization_id;
END $function$;