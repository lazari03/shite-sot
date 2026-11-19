"use client";

import { useSyncExternalStore } from "react";

/**
 * One shared 1s ticker for every countdown on the page (low overhead).
 * During SSR + hydration we render with the *server* time passed down as a prop, so markup
 * matches exactly. After hydration we switch to the client clock, corrected for skew.
 */
let now = 0;
let skew = 0;
let skewSet = false;
let interval: ReturnType<typeof setInterval> | null = null;
let alignTimeout: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function tick() {
  now = Date.now() + skew;
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!interval && !alignTimeout) {
    tick();
    // Align to the next whole second so all timers flip together.
    alignTimeout = setTimeout(() => {
      alignTimeout = null;
      tick();
      interval = setInterval(tick, 1000);
    }, 1000 - (Date.now() % 1000));
  }
  return () => {
    listeners.delete(cb);
    if (listeners.size) return;
    if (interval) clearInterval(interval);
    if (alignTimeout) clearTimeout(alignTimeout);
    interval = null;
    alignTimeout = null;
  };
}

/** Only correct skew when the client clock is clearly wrong (>5s), not for network latency. */
export function registerServerNow(serverNow: number) {
  if (skewSet || typeof window === "undefined") return;
  skewSet = true;
  const diff = serverNow - Date.now();
  if (Math.abs(diff) > 5000) skew = diff;
}

export function useNow(serverNow: number): number {
  registerServerNow(serverNow);
  return useSyncExternalStore(
    subscribe,
    () => now || Date.now() + skew,
    () => serverNow,
  );
}
