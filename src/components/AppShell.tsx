import { Link, useRouterState, type LinkProps } from "@tanstack/react-router";
import { ChevronLeft, Home, ClipboardList, Map as MapIcon, Truck, Users } from "lucide-react";
import type { ReactNode } from "react";

const NAV = [
  { to: "/dashboard", label: "Αρχική", icon: Home },
  { to: "/orders", label: "Παραγγελίες", icon: ClipboardList },
  { to: "/map", label: "Χάρτης", icon: MapIcon },
  { to: "/deliveries", label: "Διανομές", icon: Truck },
  { to: "/customers", label: "Πελάτες", icon: Users },
] as const;

export function Ambient() {
  return (
    <>
      <div className="animate-drift pointer-events-none absolute -left-20 -top-24 h-80 w-80 rounded-full bg-brand/25 blur-3xl" />
      <div className="animate-drift pointer-events-none absolute -right-24 top-52 h-96 w-96 rounded-full bg-accent/25 blur-3xl [animation-direction:reverse] [animation-duration:18s]" />
      <div className="animate-drift pointer-events-none absolute bottom-10 left-1/4 h-72 w-72 rounded-full bg-info/20 blur-3xl [animation-duration:22s]" />
      <div className="dotted-field pointer-events-none absolute inset-0" />
    </>
  );
}

export function AppShell({
  title,
  subtitle,
  back,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  back?: LinkProps["to"];
  action?: ReactNode;
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background text-foreground">
      <Ambient />

      <div className="relative mx-auto max-w-[460px] px-4 pb-32 pt-6">
        <header className="mb-5 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {back ? (
              <Link
                to={back}
                aria-label="Πίσω"
                className="glass press grid h-11 w-11 shrink-0 place-items-center rounded-2xl"
              >
                <ChevronLeft className="h-5 w-5" />
              </Link>
            ) : (
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand/20 ring-1 ring-brand/40">
                <span className="font-display text-lg font-bold text-brand">Α</span>
              </div>
            )}
            <div className="min-w-0">
              <h1 className="font-display truncate text-[17px] font-semibold leading-tight">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
              ) : null}
            </div>
          </div>
          {action}
        </header>

        {children}
      </div>

      <nav className="fixed bottom-3 left-1/2 z-40 w-[calc(100%-1.5rem)] max-w-[420px] -translate-x-1/2">
        <div className="glass flex justify-between gap-1 rounded-3xl px-1.5 py-1.5">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`press flex flex-1 flex-col items-center gap-1 rounded-2xl py-2 ${
                  active ? "bg-brand/20 ring-1 ring-brand/30" : ""
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${active ? "text-brand" : "text-muted-foreground"}`}
                />
                <span
                  className={`text-[10px] font-semibold leading-none ${
                    active ? "text-brand" : "text-muted-foreground"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`glass rounded-3xl p-4 ${className}`}>{children}</div>;
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="glass-soft rounded-3xl px-4 py-10 text-center">
      <p className="font-display text-sm font-semibold">{title}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function Loading() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="glass-soft h-24 animate-pulse rounded-3xl" />
      ))}
    </div>
  );
}
