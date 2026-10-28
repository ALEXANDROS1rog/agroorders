import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CreditCard, UserRound, LifeBuoy } from "lucide-react";
import { AppShell, Card, EmptyState, Loading } from "@/components/AppShell";
import { OrgAccess } from "@/components/OrgAccess";
import { FEATURE_LABEL, fetchPlans, useOrg } from "@/lib/org";
import { formatCurrency } from "@/lib/domain";
import { useState, useEffect, lazy, Suspense } from "react";
import { useServerFn } from "@tanstack/react-start";
import { PrimaryButton, GhostButton, Select } from "@/components/Field";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { companyBillingState, createCompanyPortal, upgradeCompanyPlan } from "@/lib/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { ANNUAL_PLANS, annualPrice, isPlanSlug, canEnterAfterPayment, canUpgrade, needsPlanSelection, planSlugForKey, CHECKOUT_FEATURES, type PlanSlug } from "@/lib/subscription-rules";
const CompanyCheckout = lazy(() => import("@/components/CompanyCheckout").then(m => ({ default: m.CompanyCheckout })));

export const Route = createFileRoute("/_authenticated/plans")({
  head: () => ({ meta: [
    { title: "Πλάνα και συνδρομή — VoiceOrders" }, { name: "description", content: "Πλάνα, όρια μελών και δυνατότητες της επιχείρησής σας στο VoiceOrders." },
    { property: "og:title", content: "Πλάνα και συνδρομή — VoiceOrders" }, { property: "og:description", content: "Πλάνα και συνδρομή επιχείρησης στο VoiceOrders." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), validateSearch: (search: Record<string, unknown>): { session_id?: string } => typeof search['session_id'] === "string" ? { session_id: search['session_id'] } : {}, component: PlansPage,
});
function PlansPage() { return <OrgAccess permission="billing.manage" title="Πλάνα και συνδρομή"><PlansBody /></OrgAccess>; }
function PlansBody() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { org } = useOrg();
  const plans = useQuery({ queryKey: ["plans"], queryFn: fetchPlans });
  const { session_id } = Route.useSearch();
  const [selected, setSelected] = useState<PlanSlug | null>(null);
  const [businessSeats, setBusinessSeats] = useState(4);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [upgrading, setUpgrading] = useState<PlanSlug | null>(null);
  const billing = useServerFn(companyBillingState);
  const portal = useServerFn(createCompanyPortal);
  const upgrade = useServerFn(upgradeCompanyPlan);
  const configured = !!import.meta.env['VITE_PAYMENTS_CLIENT_TOKEN'];
  const state = useQuery({ queryKey: ["billing-state", session_id], enabled: configured, queryFn: async () => {
    const result = await billing({ data: { environment: getStripeEnvironment(), ...(session_id ? { sessionId: session_id } : {}) } });
    if ("error" in result) throw new Error(result.error);
    return result;
  }, refetchInterval: session_id ? 3000 : 15000 });
  const status: Record<string, string> = { active: "Ενεργή", unpaid: "Απλήρωτη", cancelled: "Ακυρωμένη", past_due: "Εκκρεμής πληρωμή", trialing: "Δοκιμαστική" };
  const confirmed = canEnterAfterPayment(state.data?.state, state.data?.paymentStatus, org?.features ?? []);
  useEffect(() => {
    if (session_id && state.data?.state?.paid && state.data.paymentStatus === "paid") {
      void qc.invalidateQueries({ queryKey: ["org-context"] });
    }
  }, [session_id, state.data, qc]);
  useEffect(() => {
    if (confirmed) void navigate({ to: "/dashboard", replace: true });
  }, [confirmed, navigate]);
  const onboarding = needsPlanSelection(org);
  const paid = !!state.data?.state?.paid;
  const currentSlug = planSlugForKey(state.data?.state?.price_id) ?? org?.plan_slug ?? null;
  const doUpgrade = async (slug: PlanSlug) => {
    if (!window.confirm("Η αναβάθμιση θα χρεώσει αναλογικά τη διαφορά. Θέλετε να συνεχίσετε;")) return;
    setError(""); setNotice(""); setUpgrading(slug);
    try {
      const r = await upgrade({ data: { plan: slug, seats: slug === "business" ? businessSeats : ANNUAL_PLANS[slug].seats, environment: getStripeEnvironment() } });
      if ("error" in r) throw new Error(r.error);
      setNotice(r.pending ? "Η αναβάθμιση εκκρεμεί μέχρι να ολοκληρωθεί η πληρωμή της διαφοράς." : "Η αναβάθμιση ολοκληρώθηκε. Η χρέωση της διαφοράς έγινε αναλογικά.");
      void qc.invalidateQueries({ queryKey: ["billing-state"] });
      void qc.invalidateQueries({ queryKey: ["org-context"] });
    } catch (e) { setError(e instanceof Error ? e.message : "Σφάλμα"); }
    finally { setUpgrading(null); }
  };
  const content = <div className="space-y-4">
    <PaymentTestModeBanner />
    {paid && getStripeEnvironment() === "sandbox" ? <p role="status" className="surface-subtle p-3 text-sm">Η δοκιμαστική πληρωμή επιβεβαιώθηκε. Δεν ενεργοποιεί πραγματική συνδρομή.</p> : null}
    {onboarding ? null : <div className="flex items-start gap-3"><CreditCard className="h-6 w-6 shrink-0 text-brand" /><div><p className="font-semibold">{org?.plan_name ?? "—"}</p><p className="text-sm text-muted-foreground">Κατάσταση συνδρομής: {status[org?.subscription_status ?? ""] ?? "—"}</p></div></div>}
    {session_id ? <p role="status" className="surface-subtle p-3 text-sm">{paid && state.data?.paymentStatus === "paid" ? "Η πληρωμή επιβεβαιώθηκε." : state.data?.paymentStatus === "expired" ? "Η πληρωμή ακυρώθηκε ή έληξε." : state.data?.paymentStatus === "unpaid" ? "Η πληρωμή εκκρεμεί ή δεν ολοκληρώθηκε." : "Αναμονή επιβεβαίωσης πληρωμής."}</p> : null}
    {notice ? <p role="status" className="surface-subtle p-3 text-sm">{notice}</p> : null}
    {state.error || error ? <p role="alert" className="text-sm text-destructive" data-no-translate>{error || state.error?.message}</p> : null}
    {!onboarding && state.data?.state?.customer_id ? <GhostButton onClick={async () => { try { const r = await portal({ data: { environment: getStripeEnvironment() } }); if ("error" in r) throw new Error(r.error); window.open(r.url, "_blank", "noopener,noreferrer"); } catch (e) { setError(e instanceof Error ? e.message : "Σφάλμα"); } }}>Διαχείριση συνδρομής</GhostButton> : null}
    {selected ? <><GhostButton onClick={() => setSelected(null)}>Ακύρωση πληρωμής</GhostButton><Suspense fallback={<Loading />}><CompanyCheckout key={`${selected}-${businessSeats}`} plan={selected} seats={selected === "business" ? businessSeats : ANNUAL_PLANS[selected].seats} /></Suspense></> : null}
    {plans.isLoading ? <Loading /> : plans.isError ? <EmptyState title="Δεν ήταν δυνατή η φόρτωση των πλάνων." /> : plans.data?.map((p) => {
      const isCurrent = paid && p.slug === currentSlug && (org?.features.length ?? 0) > 0;
      if (!isPlanSlug(p.slug)) return null;
      const seats = p.slug === "business" ? businessSeats : ANNUAL_PLANS[p.slug].seats;
      const tooSmall = (org?.active_users ?? 0) + (org?.pending_invites ?? 0) > seats;
      return <Card key={p.id} className={`space-y-3 ${isCurrent ? "border-brand/50" : ""}`}>
      <div className="flex items-center justify-between gap-2"><h2 className="text-xl font-bold" data-no-translate>{p.name}</h2>{isCurrent ? <span className="text-sm font-semibold text-brand">Τρέχον πλάνο</span> : null}</div>
      <p className="text-3xl font-bold">{formatCurrency(annualPrice(p.slug, seats))} <span className="text-sm font-normal text-muted-foreground">/ έτος</span></p>
      <p className="font-semibold">Μέγιστοι χρήστες: {seats}</p>
      {p.slug === "business" ? <><Select label="Αριθμός χρηστών" value={businessSeats} disabled={!!selected || !!upgrading} onChange={e => setBusinessSeats(Number(e.target.value))}>{Array.from({ length: 7 }, (_, i) => i + 4).map(n => <option key={n} value={n}>{n}</option>)}</Select><p className="text-sm text-muted-foreground">4 χρήστες περιλαμβάνονται. +300€ / έτος για κάθε επιπλέον χρήστη, έως 10 συνολικά.</p></> : null}
      {isCurrent ? <p className="text-sm text-muted-foreground">Χρήστες τρέχουσας συνδρομής: {org?.max_users}</p> : null}
      <ul className="space-y-2">{p.features.filter(f => CHECKOUT_FEATURES.has(f)).map((f) => <li key={f} className="flex items-start gap-2 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" /><span>{FEATURE_LABEL[f] ?? f}</span></li>)}</ul>
      {paid
        ? (canUpgrade(currentSlug, p.slug) ? <PrimaryButton disabled={!configured || !!upgrading || tooSmall} onClick={() => { if (isPlanSlug(p.slug)) void doUpgrade(p.slug); }}>{upgrading === p.slug ? "Αναβάθμιση..." : "Αναβάθμιση πλάνου"}</PrimaryButton> : null)
        : <PrimaryButton disabled={!configured || !!selected || tooSmall} onClick={() => { if (isPlanSlug(p.slug)) setSelected(p.slug); }}>Επιλογή πλάνου</PrimaryButton>}
    </Card>; })}
    <Link to="/help" className="surface press flex h-14 items-center justify-center gap-2 rounded-2xl font-semibold"><LifeBuoy className="h-5 w-5 text-brand" />Κέντρο βοήθειας</Link>
  </div>;
  if (onboarding) return <div data-tone="account" className="min-h-screen bg-background text-foreground"><main className="mx-auto max-w-[460px] px-4 pb-10 pt-[calc(1.5rem+env(safe-area-inset-top))]"><div className="mb-4 flex items-center justify-between gap-3"><h1 className="font-display text-2xl font-bold">Επιλέξτε πλάνο</h1><Link to="/profile" className="surface press flex h-11 items-center gap-2 rounded-2xl px-3 text-sm font-semibold"><UserRound className="h-5 w-5 text-brand" />Λογαριασμός</Link></div>{content}</main></div>;
  return <AppShell title="Πλάνα και συνδρομή" back="/organization">{content}</AppShell>;
}