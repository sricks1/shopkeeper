"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// A thin top bar that appears the instant an internal link is tapped and clears
// once the destination route commits. JS-driven (a capture-phase click
// listener) so it doesn't depend on CSS :active, which iOS applies
// inconsistently — the point is immediate acknowledgment of the tap.
export default function NavProgress() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Route committed → the navigation is done, hide the bar.
  // biome-ignore lint/correctness/useExhaustiveDependencies: clear on every path change
  useEffect(() => {
    setVisible(false);
    if (timeout.current) clearTimeout(timeout.current);
  }, [pathname]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }
      const anchor = (e.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (
        !href ||
        anchor.getAttribute("target") === "_blank" ||
        anchor.hasAttribute("download") ||
        href.startsWith("#") ||
        href.startsWith("http") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href === pathname // same page — no route change coming
      ) {
        return;
      }
      setVisible(true);
      if (timeout.current) clearTimeout(timeout.current);
      // Safety net: never let the bar hang forever if a nav stalls.
      timeout.current = setTimeout(() => setVisible(false), 10000);
    }

    // Empty touchstart listener also lets iOS apply :active press styles.
    const noop = () => {};
    document.addEventListener("click", onClick, true);
    document.addEventListener("touchstart", noop, { passive: true });
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("touchstart", noop);
    };
  }, [pathname]);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden md:left-60"
      aria-hidden="true"
    >
      <div className="h-full animate-[indeterminate-bar_1.1s_ease-in-out_infinite] rounded-r-full bg-accent" />
    </div>
  );
}
