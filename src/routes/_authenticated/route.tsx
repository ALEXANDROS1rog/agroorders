import { createFileRoute, Navigate, Outlet, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/lib/org";
import { needsPlanSelection } from "@/lib/subscription-rules";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect();
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function redirect() {
  return new Response(null, { status: 307, headers: { Location: "/auth" } });
}

/** A new owner without a plan sees only the plan selection screen. */
function AuthenticatedLayout() {
  const { org } = useOrg();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (needsPlanSelection(org) && pathname !== "/plans") return <Navigate to="/plans" replace />;
  return <Outlet />;
}
