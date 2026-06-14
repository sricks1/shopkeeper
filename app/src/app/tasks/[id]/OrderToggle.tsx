"use client";

import { createClient } from "@/lib/supabase/client";
import type { Enums } from "@/lib/types/database.types";
import { ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
      <div className="mb-4 flex items-center justify-between gap-2 rounded-xl bg-[#e06829]/5 px-4 py-3 text-sm ring-1 ring-[#e06829]/20">
        <span className="flex items-center gap-2 font-medium text-[#c55a22]">
          <ShoppingCart size={15} className="shrink-0" />
          On the Orders board
        </span>
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          className="shrink-0 text-xs font-medium text-zinc-500 hover:underline disabled:opacity-50"
        >
          {busy ? "…" : "Remove"}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[#e06829]/40 bg-white px-4 py-2.5 text-sm font-semibold text-[#c55a22] transition-colors hover:bg-[#e06829]/5 disabled:opacity-60"
    >
      <ShoppingCart size={15} />
      {busy ? "…" : "Make this an order"}
    </button>
  );
}
