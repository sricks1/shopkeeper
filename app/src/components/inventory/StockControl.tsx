"use client";

import { StockStatusBadge } from "@/components/StatusBadge";
import { createClient } from "@/lib/supabase/client";
import type { Enums } from "@/lib/types/database.types";
import { Check, ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type StockStatus = Enums<"stock_status">;

interface StockControlProps {
  inventoryItemId: string;
  consumableTypeId: string;
  status: StockStatus;
  name: string;
  vendor: string | null;
  vendorUrl: string | null;
  sku: string | null;
  /** Compact = just the contextual button, for list rows. */
  compact?: boolean;
}

export default function StockControl({
  inventoryItemId,
  consumableTypeId,
  status,
  name,
  vendor,
  vendorUrl,
  sku,
  compact,
}: StockControlProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // In Stock → Re-order: mark on_order + spin up an order task on the board.
  async function reorder() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: statusErr } = await supabase
      .from("inventory_items")
      .update({ stock_status: "on_order", last_ordered_at: new Date().toISOString() })
      .eq("id", inventoryItemId);
    if (statusErr) {
      setError(statusErr.message);
      setBusy(false);
      return;
    }

    const notes =
      [
        vendor ? `Vendor: ${vendor}` : null,
        vendorUrl ? `Link: ${vendorUrl}` : null,
        sku ? `SKU: ${sku}` : null,
      ]
        .filter(Boolean)
        .join("\n") || null;

    const { error: taskErr } = await supabase.from("staff_tasks").insert({
      name: `Order: ${name}`,
      notes,
      status: "todo",
      consumable_type_id: consumableTypeId,
      created_by: user?.id ?? null,
    });
    setBusy(false);
    if (taskErr) {
      setError(taskErr.message);
      return;
    }
    router.refresh();
  }

  // On Order → In Stock: mark in_stock + close out the linked order task(s).
  async function markInStock() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: statusErr } = await supabase
      .from("inventory_items")
      .update({ stock_status: "in_stock" })
      .eq("id", inventoryItemId);
    if (statusErr) {
      setError(statusErr.message);
      setBusy(false);
      return;
    }
    await supabase
      .from("staff_tasks")
      .update({ status: "done" })
      .eq("consumable_type_id", consumableTypeId)
      .neq("status", "done");
    setBusy(false);
    router.refresh();
  }

  // Neutral navy-outline action button: a verb the user *does*, visually distinct
  // from the colored state pill so it can't be misread as the current status.
  const actionCls =
    "inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#324168]/40 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#324168] transition-colors hover:bg-[#324168]/5 disabled:opacity-60";

  if (compact) {
    return (
      <div className="flex shrink-0 items-center gap-2">
        <StockStatusBadge status={status} />
        {status === "in_stock" ? (
          <button type="button" onClick={reorder} disabled={busy} className={actionCls}>
            <ShoppingCart size={13} />
            {busy ? "…" : "Re-order"}
          </button>
        ) : (
          <button type="button" onClick={markInStock} disabled={busy} className={actionCls}>
            <Check size={13} />
            {busy ? "…" : "Received"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white px-4 py-4 shadow-sm ring-1 ring-zinc-200">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-zinc-700">Stock</p>
          <div className="mt-1.5">
            <StockStatusBadge status={status} />
          </div>
        </div>
        {status === "in_stock" ? (
          <button
            type="button"
            onClick={reorder}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg border border-[#324168]/40 bg-white px-4 py-2.5 text-sm font-semibold text-[#324168] transition-colors hover:bg-[#324168]/5 disabled:opacity-60"
          >
            <ShoppingCart size={16} />
            {busy ? "Ordering…" : "Re-order"}
          </button>
        ) : (
          <button
            type="button"
            onClick={markInStock}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg border border-[#324168]/40 bg-white px-4 py-2.5 text-sm font-semibold text-[#324168] transition-colors hover:bg-[#324168]/5 disabled:opacity-60"
          >
            <Check size={16} />
            {busy ? "…" : "Mark received"}
          </button>
        )}
      </div>
      {status === "on_order" && (
        <p className="mt-2 text-xs text-zinc-400">
          Ordered — there's an order task on the board. Tap “Mark received” when it arrives.
        </p>
      )}
      {error && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
    </div>
  );
}
