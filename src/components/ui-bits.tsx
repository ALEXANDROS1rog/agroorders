import type { ReactNode } from "react";
import { Phone, Navigation } from "lucide-react";
import { ORDER_STATUS_CHIP, ORDER_STATUS_LABEL, navigationHref, telHref, type OrderStatus } from "@/lib/domain";

export function StatusChip({ status }: { status: string }) {
  const s = status as OrderStatus;
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${ORDER_STATUS_CHIP[s] ?? ""}`}>
      {ORDER_STATUS_LABEL[s] ?? status}
    </span>
  );
}

export function ActionLink({ href, children, tone = "glass" }: { href: string; children: ReactNode; tone?: "glass" | "brand" }) {
  const external = href.startsWith("http");
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className={`press flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl text-sm font-semibold ${
        tone === "brand" ? "bg-brand text-brand-foreground" : "glass text-foreground"
      }`}
    >
      {children}
    </a>
  );
}

export function CallNavButtons({ phone, address, latitude, longitude }: { phone?: string | null; address?: string | null; latitude?: number | null; longitude?: number | null }) {
  return (
    <>
      {phone ? (
        <ActionLink href={telHref(phone)}>
          <Phone className="h-4 w-4" /> Κλήση
        </ActionLink>
      ) : null}
      {address || (latitude != null && longitude != null) ? (
        <ActionLink href={navigationHref({ latitude, longitude, address })}>
          <Navigation className="h-4 w-4" /> Πλοήγηση
        </ActionLink>
      ) : null}
    </>
  );
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="glass-soft mb-4 h-14 w-full rounded-2xl px-4 text-[15px] outline-none placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-ring/60"
    />
  );
}
