export type TabBounds = { left: number; width: number };

export function tabAtPosition(x: number, tabs: readonly TabBounds[]): number {
  if (!tabs.length) return -1;
  let closest = 0;
  let distance = Infinity;
  tabs.forEach((tab, index) => {
    const next = Math.abs(x - (tab.left + tab.width / 2));
    if (next < distance) {
      closest = index;
      distance = next;
    }
  });
  return closest;
}

export function bubblePosition(x: number, width: number, containerWidth: number, inset = 6): number {
  return Math.max(inset, Math.min(x - width / 2, containerWidth - width - inset));
}

export function selectedIcon(pathname: string, explicitlySelected: string | null, destination: string): boolean {
  return explicitlySelected === destination && pathname.startsWith(destination);
}

export function liquidBubbleWidth(width: number, distance: number, elapsed: number): number {
  const speed = Math.abs(distance) / Math.max(elapsed, 1);
  return width + Math.min(speed * 10, 14);
}

export function springStep(position: number, velocity: number, target: number, seconds: number) {
  const dt = Math.min(Math.max(seconds, 0), 1 / 30);
  const nextVelocity = velocity + ((target - position) * 230 - velocity * 23) * dt;
  const nextPosition = position + nextVelocity * dt;
  return Math.abs(target - nextPosition) < 0.05 && Math.abs(nextVelocity) < 0.5
    ? { position: target, velocity: 0 }
    : { position: nextPosition, velocity: nextVelocity };
}