import { Link, useNavigate, useRouter, useRouterState, type LinkProps } from "@tanstack/react-router";
import { ChevronLeft, Home, ClipboardList, Truck, Users, Route as RouteIcon } from "lucide-react";
import { useI18n, type TKey } from "@/lib/i18n";
import { createTabPager } from "@/lib/tab-pager";
import {
  Component,
  Suspense,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
  type ReactNode,
} from "react";

const NAV = [
  { to: "/dashboard", label: "nav.home" as TKey, icon: Home },
  { to: "/orders", label: "nav.orders" as TKey, icon: ClipboardList },
  { to: "/deliveries", label: "nav.deliveries" as TKey, icon: Truck },
  { to: "/customers", label: "nav.customers" as TKey, icon: Users },
  { to: "/trips", label: "nav.routes" as TKey, icon: RouteIcon },
] as const;

type ShellProps = {
  title: string;
  subtitle?: string | undefined;
  back?: LinkProps["to"] | undefined;
  action?: ReactNode;
  children: ReactNode;
};

/**
 * True inside a neighbouring page that is rendered next to the current one while the
 * user is swiping between tabs. Such a page is a visual preview: it must not start
 * background work (GPS watchers, auto-confirm) of its own.
 */
const PaneContext = createContext(false);
export function useIsPreviewPane() {
  return useContext(PaneContext);
}

/* ------------------------------------------------------------------------------------------ *
 * Page chrome: sticky toolbar + content. Every page renders <AppShell>; the outermost one
 * adds the swipeable frame and the tab bar, nested previews render only this part.
 * ------------------------------------------------------------------------------------------ */

function PageBody({ title, subtitle, back, action, children }: ShellProps) {
  const { t } = useI18n();
  const preview = useIsPreviewPane();
  // The toolbar adopts Liquid Glass only when content scrolls underneath it.
  const [scrolledState, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  // A previewed page is shown from its top, exactly as it will look after the swipe completes.
  const scrolled = scrolledState && !preview;

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
              className="surface press grid h-11 w-11 shrink-0 place-items-center rounded-2xl"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
          ) : (
            <Link
              to="/profile"
              aria-label="Το προφίλ μου"
              className="surface press grid h-11 w-11 shrink-0 place-items-center rounded-2xl"
            >
              <span className="font-display text-lg font-bold text-brand">V</span>
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
 * Neighbouring pages: the real route component of the adjacent tab, rendered next to the
 * current page so it can slide in under the finger.
 * ------------------------------------------------------------------------------------------ */

type RouteLike = { options: { component?: ComponentType } };

function findRoute(router: unknown, to: string): RouteLike | undefined {
  const byPath = (router as { routesByPath?: Record<string, RouteLike> }).routesByPath ?? {};
  return byPath[to] ?? byPath[`${to}/`];
}

/** Resolves a route's component, loading its code-split chunk first when needed. */
async function loadRouteComponent(router: unknown, to: string): Promise<ComponentType | null> {
  const route = findRoute(router, to);
  if (!route) return null;
  try {
    await (router as { loadRouteChunk?: (r: unknown) => Promise<unknown> }).loadRouteChunk?.(route);
  } catch {
    /* fall through: use whatever component is already attached */
  }
  return route.options.component ?? null;
}

/** A broken preview must never take the real page down with it. */
class PreviewBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

function NeighborPage({ to }: { to: string }) {
  const router = useRouter();
  const [Page, setPage] = useState<ComponentType | null>(() => findRoute(router, to)?.options.component ?? null);
  useEffect(() => {
    if (Page) return;
    let alive = true;
    void loadRouteComponent(router, to).then((c) => {
      if (alive && c) setPage(() => c);
    });
    return () => {
      alive = false;
    };
  }, [Page, router, to]);

  if (!Page) return null;
  return (
    <PreviewBoundary>
      <Suspense fallback={null}>
        <Page />
      </Suspense>
    </PreviewBoundary>
  );
}

function NeighborPane({ side, top, to }: { side: "prev" | "next"; top: number; to: string }) {
  return (
    <div
      data-neighbor
      aria-hidden="true"
      inert
      className="pointer-events-none absolute w-full"
      style={{ top, left: side === "prev" ? "-100%" : "100%" }}
    >
      <PaneContext.Provider value={true}>
        <NeighborPage to={to} />
      </PaneContext.Provider>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------ *
 * Outer frame: swipeable track + floating tab bar.
 * ------------------------------------------------------------------------------------------ */

function ShellFrame(props: ShellProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const router = useRouter();
  const { t } = useI18n();

  // Highlighted tab (also for detail pages such as /orders/123) ...
  const activeIndex = NAV.findIndex((n) => pathname.startsWith(n.to));
  // ... but only the tab roots themselves are swipeable.
  const tabIndex = NAV.findIndex((n) => pathname === n.to || pathname === `${n.to}/`);
  const pagerOn = tabIndex >= 0 && !props.back;

  // Read through a ref so a changing navigate identity never tears down an active swipe.
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  // null = at rest. Set while a swipe is active so the neighbours get mounted.
  const [reveal, setReveal] = useState<{ top: number } | null>(null);


  // The tab bar is driven by one CSS variable (the fractional tab position); no re-render per frame.
  const paintNav = useCallback((position: number) => {
    navRef.current?.style.setProperty("--pos", String(position));
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!pagerOn || !viewport || !track) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pager = createTabPager({
      viewport,
      track,
      count: NAV.length,
      getIndex: () => tabIndex,
      onLock: () => setReveal({ top: window.scrollY }),
      onProgress: paintNav,
      onCommit: (target) => {
        // Align the incoming page with the top of the screen and reset the scroll in the same
        // frame, so there is no jump when the real page replaces the preview.
        viewport.querySelectorAll<HTMLElement>("[data-neighbor]").forEach((el) => {
          el.style.top = "0px";
        });
        window.scrollTo(0, 0);
        void navigateRef.current({ to: NAV[target]!.to });
      },
      onRest: () => setReveal(null),
      reducedMotion: () => reduceMotion.matches,
    });
    return () => pager.destroy();
  }, [pagerOn, tabIndex, paintNav]);

  // Warm up the neighbours' code so the first swipe doesn't wait for a download.
  useEffect(() => {
    if (!pagerOn) return;
    for (const i of [tabIndex - 1, tabIndex + 1]) {
      const item = NAV[i];
      if (item) void loadRouteComponent(router, item.to);
    }
  }, [pagerOn, tabIndex, router]);

  return (
    // overflow-clip (not hidden) contains off-screen neighbours
    // without turning this element into a scroll container (that would break the sticky toolbar).
    <div className="relative min-h-screen w-full overflow-clip bg-background text-foreground">
{/* pan-y: the browser keeps vertical scrolling and pinch-zoom, we get the horizontal drag. */}
      <div
        ref={viewportRef}
        className="relative"
        style={pagerOn ? { touchAction: "pan-y pinch-zoom" } : undefined}
      >
        <div ref={trackRef} className="relative w-full">
          <PageBody {...props} />
          {reveal && tabIndex > 0 ? (
            <NeighborPane side="prev" top={reveal.top} to={NAV[tabIndex - 1]!.to} />
          ) : null}
          {reveal && tabIndex < NAV.length - 1 ? (
            <NeighborPane side="next" top={reveal.top} to={NAV[tabIndex + 1]!.to} />
          ) : null}
        </div>
      </div>

      <nav className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 z-40 w-[calc(100%-1.5rem)] max-w-[420px] -translate-x-1/2">
        <div
          ref={navRef}
          style={{ "--pos": activeIndex } as CSSProperties}
          className="liquid-glass relative flex rounded-[1.75rem] p-1.5"
        >
          {/* The glass capsule follows the live fractional tab position. */}
          {activeIndex >= 0 ? (
            <span
              aria-hidden="true"
              className="liquid-glass-clear pointer-events-none absolute bottom-1.5 left-1.5 top-1.5 rounded-[1.375rem] will-change-transform"
              style={{
                width: `calc((100% - 0.75rem) / ${NAV.length})`,
                transform: "translate3d(calc(var(--pos) * 100%), 0, 0)",
              }}
            />
          ) : null}
          {NAV.map((item, i) => {
            const active = i === activeIndex;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? "page" : undefined}
                style={{ "--i": i } as CSSProperties}
                className="tab-tone press relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[1.375rem] px-0.5 py-2"
              >
                <Icon className="h-5 w-5" />
                <span className="w-full truncate text-center text-[10px] font-semibold leading-none">
                  {t(item.label)}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function AppShell(props: ShellProps) {
  const preview = useIsPreviewPane();
  return preview ? <PageBody {...props} /> : <ShellFrame {...props} />;
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
