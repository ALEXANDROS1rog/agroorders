ALTER POLICY orders_view ON public.orders USING (
 public.has_org_permission(organization_id, 'orders.view')
 AND (public.org_role(organization_id) IN ('owner','manager') OR public.can_access_order(id))
);
COMMENT ON POLICY orders_view ON public.orders IS 'Owners/managers read their organization row directly, including INSERT RETURNING before an order lookup can see the new row. Drivers still require assigned-order access.';