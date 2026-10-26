REVOKE ALL PRIVILEGES ON TABLE public.role_permissions FROM anon, authenticated;
GRANT SELECT ON TABLE public.role_permissions TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER POLICY role_permissions_view ON public.role_permissions TO authenticated USING (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.user_id = auth.uid() AND m.status = 'active' AND m.role = role_permissions.role));
COMMENT ON TABLE public.role_permissions IS 'Global role permission definitions; app users have read-only access to their active membership roles. Changes are service-role only.';