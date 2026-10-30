import { Link, useRouterState, type LinkProps } from "@tanstack/react-router";
import { ChevronLeft, Home, ClipboardList, Truck, Users, Route as RouteIcon } from "lucide-react";
import { useI18n, type TKey } from "@/lib/i18n";
import { useEffect, useState, type ReactNode } from "react";
import { useOrg } from "@/lib/org";
import { needsPlanSelection } from "@/lib/subscription-rules";
import { GlassNavigation } from "@/components/GlassNavigation";

const NAV = [
  { to: "/dashboard", label: "nav.home" as TKey, icon: Home, tone: "home" },
  { to: "/orders", label: "nav.orders" as TKey, icon: ClipboardList, tone: "orders" },
  { to: "/deliveries", label: "nav.deliveries" as TKey, icon: Truck, tone: "deliveries" },
  { to: "/customers", label: "nav.customers" as TKey, icon: Users, tone: "customers" },
  { to: "/trips", label: "nav.routes" as TKey, icon: RouteIcon, tone: "routes" },
] as const;

type ShellProps = {
  title: string;
  subtitle?: string | undefined;
  back?: LinkProps["to"] | undefined;
  action?: ReactNode;
  children: ReactNode;
};

/* ------------------------------------------------------------------------------------------ *
 * Page chrome: sticky toolbar + content. Every page renders <AppShell>; the outermost one
 * adds the tab bar.
 * ------------------------------------------------------------------------------------------ */

function PageBody({ title, subtitle, back, action, children }: ShellProps) {
  const { t } = useI18n();
  // The toolbar adopts Liquid Glass only when content scrolls underneath it.
  const [scrolledState, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const scrolled = scrolledState;

  return (
    <div className="relative mx-auto max-w-[460px] px-4 pb-[calc(8rem+env(safe-area-inset-bottom))]">
      <header
        className={`sticky top-0 z-30 -mx-4 mb-4 flex items-center justify-between gap-3 px-4 pb-3 pt-[calc(1.5rem+env(safe-area-inset-top))] transition-[background-color,box-shadow,border-color,backdrop-filter] duration-300 ${
          scrolled ? "liquid-glass rounded-b-3xl border-t-0" : "border border-transparent"
        }`}
      >
        <div className="flex min-w-0 items-center gap-3">
          {back ? (
            <Link
              to={back}
              aria-label={t("c.back")}
              className="liquid-glass-clear press grid h-11 w-11 shrink-0 place-items-center rounded-full"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
          ) : (
            <Link
              to="/profile"
              aria-label="Το προφίλ μου"
              className="category-badge liquid-glass-clear press grid h-11 w-11 shrink-0 place-items-center rounded-full"
            >
              <span className="font-display text-lg font-semibold">V</span>
            </Link>
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
  );
}

/* ------------------------------------------------------------------------------------------ *
 * Outer frame: current route + floating tab bar.
 * ------------------------------------------------------------------------------------------ */

function ShellFrame(props: ShellProps) {
  // location changes before loaders finish; matches describe the page actually on screen.
  const pathname = useRouterState({ select: (s) => s.matches.at(-1)?.pathname ?? s.resolvedLocation?.pathname ?? s.location.pathname });
  const { t } = useI18n();
  const { org, can, hasFeature } = useOrg();
  const choosingPlan = needsPlanSelection(org);
  const permissions = [null, "orders.view", "deliveries.view", "customers.view", "routes.view"];
  const features = [null, "orders", "deliveries", "customers", "routes"];

  const tone = pathname.startsWith("/orders") || pathname.startsWith("/history") ? "orders"
    : pathname.startsWith("/trips") ? "routes"
    : pathname.startsWith("/deliveries") || pathname.startsWith("/map") ? "deliveries"
    : pathname.startsWith("/customers") ? "customers"
    : pathname.startsWith("/products") ? "products"
    : pathname.startsWith("/profile") || pathname.startsWith("/organization") || pathname.startsWith("/plans") ? "account"
    : "home";

  return (
    <div data-tone={tone} className="relative min-h-screen w-full overflow-clip bg-background text-foreground">
      <PageBody {...props} />

      {choosingPlan ? null : <GlassNavigation pathname={pathname} items={NAV.filter((_, i) => {
        const permission = permissions[i];
        const feature = features[i];
        return (!permission || can(permission)) && (!feature || hasFeature(feature));
      }).map((item) => ({ ...item, label: t(item.label) }))} />}
    </div>
  );
}

export function AppShell(props: ShellProps) {
  return <ShellFrame {...props} />;
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`surface rounded-3xl p-4 ${className}`}>{children}</div>;
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="surface-subtle rounded-3xl px-4 py-10 text-center">
      <p className="font-display text-sm font-semibold">{title}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function Loading() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="surface-subtle h-24 animate-pulse rounded-3xl" />
      ))}
    </div>
  );
}
