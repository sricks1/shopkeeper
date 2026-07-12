"use client";

import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Enums } from "@/lib/types/database.types";

type TaskStatus = Enums<"task_status">;

// Promote a normal task to a "loose" order (no consumable / inventory) or take
// it back off the Orders board. Only shown for tasks not linked to a consumable.
export default function OrderToggle({
  taskId,
  isOrder,
  status,
}: {
  taskId: string;
  isOrder: boolean;
  status: TaskStatus;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    // 'todo' isn't an Orders-board column, so a task promoted from To Do gets
    // moved into "To Order" (new) so it actually shows up there.
    const updates = isOrder
      ? { is_order: false }
      : { is_order: true, ...(status === "todo" ? { status: "new" as TaskStatus } : {}) };
    const { error } = await createClient().from("staff_tasks").update(updates).eq("id", taskId);
    setBusy(false);
    if (!error) router.refresh();
  }

  if (isOrder) {
    return (
      <div className="mb-4 flex items-center justify-between gap-2 rounded-card bg-accent/5 px-4 py-3 text-sm ring-1 ring-accent/20">
        <Link
          href="/inventory/orders"
          className="flex min-w-0 items-center gap-2 font-medium text-accent-hover hover:underline"
        >
          <ShoppingCart size={15} className="shrink-0" />
          Tracked in Inventory › Orders
        </Link>
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          className="shrink-0 text-xs font-medium text-zinc-500 hover:underline disabled:opacity-50"
          title="Turns it back into a normal task on the Tasks board"
        >
          {busy ? "…" : "Make it a task again"}
        </button>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-card border border-accent/40 bg-white px-4 py-2.5 text-sm font-semibold text-accent-hover transition-colors hover:bg-accent/5 disabled:opacity-60"
      >
        <ShoppingCart size={15} />
        {busy ? "…" : "Make this an order"}
      </button>
      <p className="mt-1 px-1 text-xs text-zinc-400">
        Moves it off the Tasks board and into Inventory › Orders.
      </p>
    </div>
  );
}
