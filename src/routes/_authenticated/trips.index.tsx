import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { AppShell, EmptyState, Loading } from "@/components/AppShell";
import { TripCard } from "@/components/TripCard";
import { fetchTrips, localDateKey } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/trips/")({
  head: () => ({
    meta: [
      { title: "Δρομολόγια — VoiceOrders" },
      { name: "description", content: "Ενεργά, προγραμματισμένα δρομολόγια και ιστορικό με έσοδα, έξοδα και καθαρά." },
      { property: "og:title", content: "Δρομολόγια — VoiceOrders" },
      { property: "og:description", content: "Διαχείριση δρομολογίων διανομής." },
    ],
  }),
  component: TripsPage,
});

function TripsPage() {
  const { t } = useI18n();
  const { data, isLoading } = useQuery({ queryKey: ["trips"], queryFn: fetchTrips });
  const today = localDateKey();
  const active = (data ?? []).filter((r) => r.route_date >= today);
  const past = (data ?? []).filter((r) => r.route_date < today).reverse();

  return (
    <AppShell
      title={t("r.title")}
      action={<Link to="/trips/new" aria-label={t("d.newRoute")} className="press grid h-11 w-11 place-items-center rounded-2xl bg-brand text-brand-foreground"><Plus className="h-5 w-5" /></Link>}
    >
      {isLoading ? <Loading /> : (
        <div className="space-y-6">
          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold">{t("r.active")}</h2>
            {active.length ? active.map((r) => <TripCard key={r.id} trip={r} />) : <EmptyState title={t("r.none")} />}
            <Link to="/trips/new" className="press flex h-14 items-center justify-center gap-2 rounded-2xl bg-brand font-semibold text-brand-foreground">
              <Plus className="h-5 w-5" /> {t("d.newRoute")}
            </Link>
          </section>
          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold">{t("r.history")}</h2>
            <p className="text-xs text-muted-foreground">{t("r.historyHint")}</p>
            {past.length ? past.map((r) => <TripCard key={r.id} trip={r} />) : <EmptyState title={t("r.none")} />}
          </section>
        </div>
      )}
    </AppShell>
  );
}
