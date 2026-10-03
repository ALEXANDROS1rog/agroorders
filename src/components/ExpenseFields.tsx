import { formatCurrency } from "@/lib/domain";
import { useI18n, type TKey } from "@/lib/i18n";

export type Expenses = { fuel: string; tolls: string; wear: string; food: string };
const ROWS: { k: keyof Expenses; label: TKey; icon: string }[] = [
  { k: "fuel", label: "r.fuel", icon: "⛽" },
  { k: "tolls", label: "r.tolls", icon: "🛣️" },
  { k: "wear", label: "r.wear", icon: "🔧" },
  { k: "food", label: "r.food", icon: "🍴" },
];

export const toAmount = (v: string) => {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0;
};

export function ExpenseFields({ value, onChange }: { value: Expenses; onChange: (v: Expenses) => void }) {
  const { t } = useI18n();
  const total = ROWS.reduce((s, r) => s + toAmount(value[r.k]), 0);
  return (
    <div className="space-y-3">
      {ROWS.map((r) => (
        <label key={r.k} className="glass-soft flex items-center gap-3 rounded-2xl px-4 py-2">
          
          <span className="flex-1 font-semibold">{t(r.label)}</span>
          <input
            inputMode="decimal"
            aria-label={t(r.label)}
            value={value[r.k]}
            onChange={(e) => onChange({ ...value, [r.k]: e.target.value.replace(/[^\d.,]/g, "") })}
            placeholder="0,00"
            className="h-12 w-28 rounded-xl bg-background/60 px-3 text-right text-lg font-semibold outline-none focus:ring-2 focus:ring-ring/60"
          />
          <span className="font-semibold">€</span>
        </label>
      ))}
      <div className="flex items-center justify-between rounded-2xl bg-destructive/10 px-4 py-3">
        <span className="font-semibold">{t("r.totalExp")}</span>
        <span className="font-display text-xl font-bold text-destructive">{formatCurrency(total)}</span>
      </div>
    </div>
  );
}
