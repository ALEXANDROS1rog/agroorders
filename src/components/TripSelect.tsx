import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Select } from "@/components/Field";
import { fetchTrips, formatTripDate, localDateKey } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

/** Dropdown to attach an order to a trip ("Δρομολόγιο"), with date search. */
export function TripSelect({ value, onChange, onlyUpcoming = false }: { value: string; onChange: (id: string) => void; onlyUpcoming?: boolean }) {
  const { t } = useI18n();
  const { data } = useQuery({ queryKey: ["trips"], queryFn: fetchTrips });
  const [q, setQ] = useState("");
  const today = localDateKey();
  const all = data ?? [];
  const list = all
    .filter((r) => !onlyUpcoming || r.route_date >= today || r.id === value)
    .filter((r) => !q || formatTripDate(r.route_date).includes(q.trim()));

  return (
    <div className="space-y-2">
      {all.length > 6 ? (
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("o.searchRoute")}
          className="glass-soft h-12 w-full rounded-2xl px-4 text-[15px] outline-none focus:ring-2 focus:ring-ring/60"
        />
      ) : null}
      <Select label={`${t("o.route")}`} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{t("o.noRoute")}</option>
        {list.map((r) => (
          <option key={r.id} value={r.id}>{formatTripDate(r.route_date)}</option>
        ))}
      </Select>
      {!all.some((r) => r.route_date >= today) ? (
        <Link to="/trips/new" className="block text-sm font-semibold text-brand underline">{t("o.createRoute")}</Link>
      ) : null}
    </div>
  );
}
