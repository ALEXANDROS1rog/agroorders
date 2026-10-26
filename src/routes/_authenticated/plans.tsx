import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, CreditCard } from "lucide-react";
import { AppShell, Card, EmptyState, Loading } from "@/components/AppShell";
import { OrgAccess } from "@/components/OrgAccess";
import { FEATURE_LABEL, fetchPlans, useOrg } from "@/lib/org";
import { formatCurrency } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/plans")({
  head: () => ({ meta: [
    { title: "Πλάνα και συνδρομή — VoiceOrders" }, { name: "description", content: "Πλάνα, όρια μελών και δυνατότητες της επιχείρησής σας στο VoiceOrders." },
    { property: "og:title", content: "Πλάνα και συνδρομή — VoiceOrders" }, { property: "og:description", content: "Πλάνα και συνδρομή επιχείρησης στο VoiceOrders." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: PlansPage,
});
function PlansPage() { return <OrgAccess permission="billing.manage" title="Πλάνα και συνδρομή"><PlansBody /></OrgAccess>; }
function PlansBody() {
  const { org } = useOrg();
  const plans = useQuery({ queryKey: ["plans"], queryFn: fetchPlans });
  const status: Record<string, string> = { active: "Ενεργή", unpaid: "Απλήρωτη", cancelled: "Ακυρωμένη", past_due: "Εκκρεμής πληρωμή", trialing: "Δοκιμαστική" };
  return <AppShell title="Πλάνα και συνδρομή" back="/organization"><div className="space-y-4">
    <div className="flex items-start gap-3"><CreditCard className="h-6 w-6 shrink-0 text-brand" /><div><p className="font-semibold">{org?.plan_name ?? "—"}</p><p className="text-sm text-muted-foreground">Κατάσταση συνδρομής: {status[org?.subscription_status ?? ""] ?? "—"}</p><p className="text-sm text-muted-foreground">Οι πληρωμές και οι αλλαγές πλάνου δεν έχουν ενεργοποιηθεί ακόμα.</p></div></div>
    {plans.isLoading ? <Loading /> : plans.isError ? <EmptyState title="Δεν ήταν δυνατή η φόρτωση των πλάνων." /> : plans.data?.map((p) => <Card key={p.id} className={`space-y-3 ${p.slug === org?.plan_slug ? "border-brand/50" : ""}`}>
      <div className="flex items-center justify-between gap-2"><h2 className="text-xl font-bold" data-no-translate>{p.name}</h2>{p.slug === org?.plan_slug ? <span className="text-sm font-semibold text-brand">Τρέχον πλάνο</span> : null}</div>
      <p className="text-3xl font-bold">{formatCurrency(p.price)} <span className="text-sm font-normal text-muted-foreground">{p.billing_interval === "year" ? "/ έτος" : p.billing_interval === "month" ? "/ μήνα" : ""}</span></p>
      <p className="font-semibold">Μέγιστοι χρήστες: {p.max_users}</p>
      <ul className="space-y-2">{p.features.map((f) => <li key={f} className="flex items-start gap-2 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" /><span>{FEATURE_LABEL[f] ?? f}</span></li>)}</ul>
    </Card>)}
  </div></AppShell>;
}