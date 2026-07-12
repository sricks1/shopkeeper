"use client";

import { Check, ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { StockStatusBadge } from "@/components/StatusBadge";
import { createConsumableOrder, receiveConsumableOrders } from "@/lib/orders";
import { createClient } from "@/lib/supabase/client";
import type { Enums } from "@/lib/types/database.types";

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

  // In Stock → Re-order: mark on_order + open an order in Inventory › Orders.
  async function reorder() {
    setBusy(true);
    setError(null);
    const { error: err } = await createConsumableOrder(createClient(), {
      inventoryItemId,
      consumableTypeId,
      name,
      vendor,
      vendorUrl,
      sku,
    });
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    router.refresh();
  }

  // On Order → In Stock: mark in_stock + close out the linked order task(s).
  async function markInStock() {
    setBusy(true);
    setError(null);
    const { error: err } = await receiveConsumableOrders(createClient(), {
      inventoryItemId,
      consumableTypeId,
    });
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    router.refresh();
  }

  // Neutral navy-outline action button: a verb the user *does*, visually distinct
  // from the colored state pill so it can't be misread as the current status.
  const actionCls =
    "inline-flex shrink-0 items-center gap-1 rounded-field border border-brand/40 bg-white px-2.5 py-1.5 text-xs font-semibold text-brand transition-colors hover:bg-brand/5 disabled:opacity-60";

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
    <div className="rounded-card bg-white px-4 py-4 shadow-sm ring-1 ring-zinc-200">
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
            className="inline-flex items-center gap-2 rounded-field border border-brand/40 bg-white px-4 py-2 text-sm font-semibold text-brand transition-colors hover:bg-brand/5 disabled:opacity-60"
          >
            <ShoppingCart size={16} />
            {busy ? "Ordering…" : "Re-order"}
          </button>
        ) : (
          <button
            type="button"
            onClick={markInStock}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-field border border-brand/40 bg-white px-4 py-2 text-sm font-semibold text-brand transition-colors hover:bg-brand/5 disabled:opacity-60"
          >
            <Check size={16} />
            {busy ? "…" : "Mark received"}
          </button>
        )}
      </div>
      {status === "on_order" && (
        <p className="mt-2 text-xs text-zinc-400">
          On order — the order below tracks it. Tap “Mark received” when it arrives.
        </p>
      )}
      {error && (
        <p className="mt-2 rounded-field bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
    </div>
  );
}
