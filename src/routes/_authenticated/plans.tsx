import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, CreditCard } from "lucide-react";
import { AppShell, Card, EmptyState, Loading } from "@/components/AppShell";
import { OrgAccess } from "@/components/OrgAccess";
import { FEATURE_LABEL, fetchPlans, useOrg } from "@/lib/org";
import { formatCurrency } from "@/lib/domain";
import { useState, lazy, Suspense } from "react";
import { useServerFn } from "@tanstack/react-start";
import { PrimaryButton, GhostButton } from "@/components/Field";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { companyBillingState, createCompanyPortal } from "@/lib/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { isPlanSlug, type PlanSlug } from "@/lib/subscription-rules";
const CompanyCheckout = lazy(() => import("@/components/CompanyCheckout").then(m => ({ default: m.CompanyCheckout })));

export const Route = createFileRoute("/_authenticated/plans")({
  head: () => ({ meta: [
    { title: "Πλάνα και συνδρομή — VoiceOrders" }, { name: "description", content: "Πλάνα, όρια μελών και δυνατότητες της επιχείρησής σας στο VoiceOrders." },
    { property: "og:title", content: "Πλάνα και συνδρομή — VoiceOrders" }, { property: "og:description", content: "Πλάνα και συνδρομή επιχείρησης στο VoiceOrders." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), validateSearch: (search: Record<string, unknown>): { session_id?: string } => ({ session_id: typeof search.session_id === "string" ? search.session_id : undefined }), component: PlansPage,
});
function PlansPage() { return <OrgAccess permission="billing.manage" title="Πλάνα και συνδρομή"><PlansBody /></OrgAccess>; }
function PlansBody() {
  const { org } = useOrg();
  const plans = useQuery({ queryKey: ["plans"], queryFn: fetchPlans });
  const { session_id } = Route.useSearch();
  const [selected, setSelected] = useState<PlanSlug | null>(null);
  const [error, setError] = useState("");
  const billing = useServerFn(companyBillingState);
  const portal = useServerFn(createCompanyPortal);
  const configured = !!import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN;
  const state = useQuery({ queryKey: ["billing-state", session_id], enabled: configured, queryFn: async () => {
    const result = await billing({ data: { environment: getStripeEnvironment(), sessionId: session_id } });
    if ("error" in result) throw new Error(result.error);
    return result;
  }, refetchInterval: session_id ? 3000 : 15000 });
  const status: Record<string, string> = { active: "Ενεργή", unpaid: "Απλήρωτη", cancelled: "Ακυρωμένη", past_due: "Εκκρεμής πληρωμή", trialing: "Δοκιμαστική" };
  return <AppShell title="Πλάνα και συνδρομή" back="/organization"><div className="space-y-4">
    <PaymentTestModeBanner />
    <div className="flex items-start gap-3"><CreditCard className="h-6 w-6 shrink-0 text-brand" /><div><p className="font-semibold">{org?.plan_name ?? "—"}</p><p className="text-sm text-muted-foreground">Κατάσταση συνδρομής: {status[org?.subscription_status ?? ""] ?? "—"}</p></div></div>
    {session_id ? <p role="status" className="surface-subtle p-3 text-sm">{state.data?.state?.paid && state.data.paymentStatus === "paid" ? "Η πληρωμή επιβεβαιώθηκε." : state.data?.paymentStatus === "expired" ? "Η πληρωμή ακυρώθηκε ή έληξε." : state.data?.paymentStatus === "unpaid" ? "Η πληρωμή εκκρεμεί ή δεν ολοκληρώθηκε." : "Αναμονή επιβεβαίωσης πληρωμής."}</p> : null}
    {state.error || error ? <p role="alert" className="text-sm text-destructive" data-no-translate>{error || state.error?.message}</p> : null}
    {state.data?.state?.customer_id ? <GhostButton onClick={async () => { try { const r = await portal({ data: { environment: getStripeEnvironment() } }); if ("error" in r) throw new Error(r.error); window.open(r.url, "_blank", "noopener,noreferrer"); } catch (e) { setError(e instanceof Error ? e.message : "Σφάλμα"); } }}>Διαχείριση συνδρομής</GhostButton> : null}
    {selected ? <><GhostButton onClick={() => setSelected(null)}>Ακύρωση πληρωμής</GhostButton><Suspense fallback={<Loading />}><CompanyCheckout key={selected} plan={selected} /></Suspense></> : null}
    {plans.isLoading ? <Loading /> : plans.isError ? <EmptyState title="Δεν ήταν δυνατή η φόρτωση των πλάνων." /> : plans.data?.map((p) => <Card key={p.id} className={`space-y-3 ${p.slug === org?.plan_slug ? "border-brand/50" : ""}`}>
      <div className="flex items-center justify-between gap-2"><h2 className="text-xl font-bold" data-no-translate>{p.name}</h2>{p.slug === org?.plan_slug ? <span className="text-sm font-semibold text-brand">Τρέχον πλάνο</span> : null}</div>
      <p className="text-3xl font-bold">{formatCurrency(p.price)} <span className="text-sm font-normal text-muted-foreground">{p.billing_interval === "year" ? "/ έτος" : p.billing_interval === "month" ? "/ μήνα" : ""}</span></p>
      <p className="font-semibold">Μέγιστοι χρήστες: {p.max_users}</p>
      <ul className="space-y-2">{p.features.map((f) => <li key={f} className="flex items-start gap-2 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" /><span>{FEATURE_LABEL[f] ?? f}</span></li>)}</ul>
      <PrimaryButton disabled={!configured || !!selected || !!state.data?.state?.paid || (org?.active_users ?? 0) + (org?.pending_invites ?? 0) > p.max_users} onClick={() => { if (isPlanSlug(p.slug)) setSelected(p.slug); }}>Επιλογή πλάνου</PrimaryButton>
    </Card>)}
  </div></AppShell>;
}