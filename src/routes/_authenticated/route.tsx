import { createFileRoute, Navigate, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/lib/org";
import { needsPlanSelection } from "@/lib/subscription-rules";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

/** A new owner without a plan sees only the plan selection screen. */
function AuthenticatedLayout() {
  const { org } = useOrg();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (needsPlanSelection(org) && pathname !== "/plans") return <Navigate to="/plans" replace />;
  return <Outlet />;
}
