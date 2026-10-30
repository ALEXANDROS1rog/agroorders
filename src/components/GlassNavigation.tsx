import { Link, useNavigate, type LinkProps } from "@tanstack/react-router";
import { useEffect, useRef, useState, useSyncExternalStore, type PointerEvent } from "react";
import type { LucideIcon } from "lucide-react";
import { bubblePosition, liquidBubbleWidth, selectedIcon, tabAtPosition } from "@/lib/navigation-gesture";

type Item = { to: NonNullable<LinkProps["to"]>; label: string; icon: LucideIcon; tone: string };
let explicitSelection: string | null = null;
const subscribers = new Set<() => void>();
function subscribe(listener: () => void) {
  subscribers.add(listener);
  return () => { subscribers.delete(listener); };
}
function select(destination: string) {
  explicitSelection = destination;
  subscribers.forEach((listener) => listener());
}

export function GlassNavigation({ items, pathname }: { items: Item[]; pathname: string }) {
  const navigate = useNavigate();
  const selected = useSyncExternalStore(subscribe, () => explicitSelection, () => null);
  const bar = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ id: number; width: number; x: number; time: number } | null>(null);
  const suppressClickUntil = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [bubble, setBubble] = useState({ left: 6, width: 0, visible: false });
  const active = items.findIndex((item) => item.to && pathname.startsWith(item.to));
  const itemKey = items.map((item) => item.to).join(",");

  useEffect(() => {
    const element = bar.current;
    if (!element) return;
    function measure() {
      if (!element || gesture.current) return;
      const tab = element.querySelectorAll<HTMLAnchorElement>("a")[active];
      setBubble(tab ? { left: tab.offsetLeft, width: tab.offsetWidth, visible: true } : { left: 6, width: 0, visible: false });
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [active, itemKey, dragging]);

  function position(event: PointerEvent<HTMLDivElement>) {
    const element = event.currentTarget;
    const x = event.clientX - element.getBoundingClientRect().left;
    const tabs = Array.from(element.querySelectorAll<HTMLAnchorElement>("a"));
    const index = tabAtPosition(x, tabs.map((tab) => ({ left: tab.offsetLeft, width: tab.offsetWidth })));
    return { x, index, tabs, element };
  }

  function finish(event: PointerEvent<HTMLDivElement>, cancelled: boolean) {
    if (gesture.current?.id !== event.pointerId) return;
    const { index, tabs, element } = position(event);
    gesture.current = null;
    setDragging(false);
    suppressClickUntil.current = Date.now() + 500;
    if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
    const item = items[index];
    const tab = tabs[index];
    if (!cancelled && item?.to && tab) {
      setBubble({ left: tab.offsetLeft, width: tab.offsetWidth, visible: true });
      select(item.to);
      void navigate({ to: item.to });
    }
  }

  return (
    <nav className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 z-40 w-[calc(100%-1.5rem)] max-w-[420px] -translate-x-1/2">
      <div
        ref={bar}
        className="glass-navigation liquid-glass relative isolate flex touch-none select-none items-stretch gap-0.5 rounded-full p-1.5"
        data-dragging={dragging || undefined}
        onPointerDown={(event) => {
          if (!event.isPrimary || event.button !== 0 || gesture.current) return;
          const { x, index, tabs, element } = position(event);
          const tab = tabs[index];
          if (!tab) return;
          event.preventDefault();
          gesture.current = { id: event.pointerId, width: tab.offsetWidth, x, time: event.timeStamp };
          element.setPointerCapture(event.pointerId);
          setDragging(true);
          setBubble({ left: bubblePosition(x, tab.offsetWidth, element.clientWidth), width: tab.offsetWidth, visible: true });
        }}
        onPointerMove={(event) => {
          const current = gesture.current;
          if (current?.id !== event.pointerId) return;
          const { x, element } = position(event);
          const width = liquidBubbleWidth(current.width, x - current.x, event.timeStamp - current.time);
          current.x = x;
          current.time = event.timeStamp;
          setBubble({ left: bubblePosition(x, width, element.clientWidth), width, visible: true });
        }}
        onPointerUp={(event) => finish(event, false)}
        onPointerCancel={(event) => finish(event, true)}
        onLostPointerCapture={() => {
          if (!gesture.current) return;
          gesture.current = null;
          setDragging(false);
        }}
        onClickCapture={(event) => {
          if (Date.now() < suppressClickUntil.current && event.detail !== 0) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
      >
        <div
          aria-hidden="true"
          className="glass-nav-bubble pointer-events-none absolute bottom-1.5 top-1.5 rounded-full"
          style={{ width: bubble.width, transform: `translateX(${bubble.left - 6}px)`, opacity: bubble.visible ? 1 : 0 }}
        />
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              data-nav-tone={item.tone}
              data-selected={item.to && selectedIcon(pathname, selected, item.to) ? true : undefined}
              aria-current={index === active ? "page" : undefined}
              onClick={() => { if (item.to) select(item.to); }}
              className="tab-tone relative z-10 flex min-h-[56px] min-w-0 flex-1 flex-col items-center justify-center gap-1.5 rounded-full px-0.5 py-2"
            >
              <Icon className="h-[22px] w-[22px] shrink-0" strokeWidth={index === active ? 2 : 1.65} />
              <span className="w-full truncate text-center text-[10px] font-medium leading-tight">{item.label}</span>
            </Link>
          );
        })}
        <div
          aria-hidden="true"
          className="glass-nav-color-window pointer-events-none absolute inset-1.5 z-20 flex items-stretch gap-0.5"
          style={{
            clipPath: `inset(${dragging ? -3 : 0}px calc(100% - ${bubble.left - 6 + bubble.width}px) ${dragging ? -3 : 0}px ${bubble.left - 6}px round 999px)`,
            opacity: bubble.visible && (dragging || (active >= 0 && selectedIcon(pathname, selected, items[active]?.to ?? ""))) ? 1 : 0,
          }}
        >
          {items.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={item.to} data-nav-tone={item.tone} aria-current={index === active ? "page" : undefined} className="tab-tone flex min-h-[56px] min-w-0 flex-1 flex-col items-center justify-center gap-1.5 rounded-full px-0.5 py-2">
                <Icon className="h-[22px] w-[22px] shrink-0" strokeWidth={index === active ? 2 : 1.65} />
                <span className="w-full truncate text-center text-[10px] font-medium leading-tight">{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </nav>
  );
}