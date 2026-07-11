"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Matches nothing rather than erroring when there's no signed-in user.
const NO_STAFF = "00000000-0000-0000-0000-000000000000";

// The (app) layout renders AppShell once and doesn't re-render on client-side
// navigation, so the server-fetched unread count would go stale. This hook
// refetches on every pathname change and re-syncs whenever the server sends a
// fresh initial value (router.refresh() after acknowledging).
export function useUnreadCount(initialCount: number): number {
  const pathname = usePathname();
  const [count, setCount] = useState(initialCount);
  const skipFirst = useRef(true);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  // biome-ignore lint/correctness/useExhaustiveDependencies(pathname): pathname isn't read in the effect — it's the trigger to refetch after every client-side navigation.
  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }
    let cancelled = false;
    const supabase = createClient();
    supabase.auth
      .getUser()
      .then(({ data: { user } }) =>
        supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .is("acknowledged_at", null)
          .or(`recipient_id.is.null,recipient_id.eq.${user?.id ?? NO_STAFF}`),
      )
      .then(({ count: fresh }) => {
        if (!cancelled && fresh != null) setCount(fresh);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return count;
}
