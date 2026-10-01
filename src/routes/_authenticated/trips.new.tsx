import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { AppShell, Card } from "@/components/AppShell";
import { Calendar } from "@/components/ui/calendar";
import { PrimaryButton } from "@/components/Field";
import { ExpenseFields, toAmount, type Expenses } from "@/components/ExpenseFields";
import { createTrip, localDateKey } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/trips/new")({
  head: () => ({
    meta: [
      { title: "Νέο δρομολόγιο — FarmOrders" },
      { name: "description", content: "Διάλεξε ημερομηνία και καταχώρισε τα έξοδα του δρομολογίου." },
      { property: "og:title", content: "Νέο δρομολόγιο — FarmOrders" },
      { property: "og:description", content: "Δημιουργία δρομολογίου διανομής." },
    ],
  }),
  component: NewTripPage,
});

function NewTripPage() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [date, setDate] = useState<Date | undefined>();
  const [exp, setExp] = useState<Expenses>({ fuel: "", tolls: "", wear: "", food: "" });
  const [busy, setBusy] = useState(false);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  async function save() {
    if (!date) { toast.error(t("r.pickDate")); return; }
    setBusy(true);
    try {
      const id = await createTrip({
        route_date: localDateKey(date),
        fuel: toAmount(exp.fuel), tolls: toAmount(exp.tolls), wear: toAmount(exp.wear), food: toAmount(exp.food),
      });
      toast.success(t("r.created"));
      qc.invalidateQueries();
      navigate({ to: "/trips/$id", params: { id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("c.error"));
    } finally { setBusy(false); }
  }

  return (
    <AppShell title={t("d.newRoute")} back="/trips">
      <div className="space-y-4">
        <Card>
          <h2 className="font-display mb-2 text-lg font-semibold">{t("r.when")}</h2>
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            locale={locale}
            disabled={{ before: today }}
            weekStartsOn={1}
            className="pointer-events-auto mx-auto w-full rounded-2xl bg-transparent p-0 [--cell-size:2.75rem]"
          />
          <div className={`mt-3 rounded-2xl px-4 py-3 text-center ${date ? "bg-brand/15" : "glass-soft"}`}>
            <p className="text-xs text-muted-foreground">{t("r.selected")}</p>
            <p className="font-display text-xl font-bold capitalize">{date ? format(date, "EEEE dd/MM/yyyy", { locale }) : "—"}</p>
          </div>
        </Card>
        {date ? (
          <Card>
            <h2 className="font-display mb-3 text-lg font-semibold">{t("r.expTitle")}</h2>
            <ExpenseFields value={exp} onChange={setExp} />
          </Card>
        ) : null}
        <PrimaryButton disabled={!date || busy} onClick={save}>{t("r.confirm")}</PrimaryButton>
      </div>
    </AppShell>
  );
}
