import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { el } from "date-fns/locale";
import { AppShell, Card } from "@/components/AppShell";
import { Field, GhostButton, PrimaryButton } from "@/components/Field";
import { Calendar } from "@/components/ui/calendar";
import { createRoute, localDateStr } from "@/lib/api";
import { formatCurrency } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/routes/new")({
  head: () => ({
    meta: [
      { title: "Νέο δρομολόγιο — AgroOrders" },
      { name: "description", content: "Δημιουργία δρομολογίου με ημερομηνία και έξοδα." },
      { property: "og:title", content: "Νέο δρομολόγιο — AgroOrders" },
      { property: "og:description", content: "Νέο δρομολόγιο διανομής." },
    ],
  }),
  component: NewRoutePage,
});

const EXPENSES = [
  { key: "fuel", label: "Καύσιμα" },
  { key: "tolls", label: "Διόδια" },
  { key: "wear", label: "Φθορές" },
  { key: "food", label: "Φαγητό" },
] as const;

function NewRoutePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [step, setStep] = useState<1 | 2>(1);
  const [vals, setVals] = useState<Record<string, string>>({ fuel: "", tolls: "", wear: "", food: "" });
  const [busy, setBusy] = useState(false);
  const num = (k: string) => Number((vals[k] ?? "").replace(",", ".")) || 0;
  const total = EXPENSES.reduce((s, e) => s + num(e.key), 0);

  async function confirm() {
    if (!date) return;
    setBusy(true);
    try {
      await createRoute({ route_date: localDateStr(date), fuel: num("fuel"), tolls: num("tolls"), wear: num("wear"), food: num("food") });
      toast.success("Το δρομολόγιο δημιουργήθηκε.");
      qc.invalidateQueries();
      navigate({ to: "/dashboard" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Σφάλμα");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Νέο δρομολόγιο" back="/dashboard">
      {step === 1 ? (
        <div className="space-y-3">
          <Card>
            <p className="mb-2 font-display text-lg font-semibold">Πότε θα γίνει το δρομολόγιο;</p>
            <Calendar mode="single" selected={date} onSelect={setDate} locale={el} weekStartsOn={1} className="mx-auto" />
          </Card>
          <PrimaryButton disabled={!date} onClick={() => setStep(2)}>
            {date ? `Συνέχεια — ${date.toLocaleDateString("el-GR", { day: "numeric", month: "long" })}` : "Διάλεξε ημερομηνία"}
          </PrimaryButton>
        </div>
      ) : (
        <div className="space-y-3">
          <Card className="space-y-3">
            <p className="font-display text-lg font-semibold">
              Έξοδα · {date?.toLocaleDateString("el-GR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            {EXPENSES.map((e) => (
              <Field key={e.key} label={`${e.label} (€)`} inputMode="decimal" placeholder="0" value={vals[e.key]} onChange={(ev) => setVals({ ...vals, [e.key]: ev.target.value })} />
            ))}
            <div className="flex justify-between text-lg font-bold"><span>Σύνολο εξόδων</span><span>{formatCurrency(total)}</span></div>
          </Card>
          <PrimaryButton disabled={busy} onClick={confirm}>{busy ? "Αποθήκευση…" : "Επιβεβαίωση δρομολογίου"}</PrimaryButton>
          <GhostButton onClick={() => setStep(1)}>Αλλαγή ημερομηνίας</GhostButton>
        </div>
      )}
    </AppShell>
  );
}
