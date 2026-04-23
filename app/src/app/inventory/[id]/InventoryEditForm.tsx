"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface InventoryEditFormProps {
  inventoryId: string;
  consumableTypeId: string;
  initialOnHand: number;
  initialThreshold: number;
  canEdit: boolean;
}

export default function InventoryEditForm({
  inventoryId,
  initialOnHand,
  initialThreshold,
  canEdit,
}: InventoryEditFormProps) {
  const router = useRouter();
  const [onHand, setOnHand] = useState(initialOnHand);
  const [threshold, setThreshold] = useState(initialThreshold);
  const [receiveQty, setReceiveQty] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isReceiving, setIsReceiving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const status =
    onHand <= 0 ? "out" : onHand <= threshold ? "low" : "ok";

  const statusStyle = {
    ok: "text-emerald-700 bg-emerald-50",
    low: "text-orange-700 bg-orange-50",
    out: "text-red-700 bg-red-50",
  }[status];

  async function handleSave() {
    if (!canEdit) return;
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    const supabase = createClient();
    const { error: err } = await supabase
      .from("inventory_items")
      .update({ quantity_on_hand: onHand, reorder_threshold: threshold })
      .eq("id", inventoryId);
    setIsSaving(false);
    if (err) { setError(err.message); return; }
    setSuccess("Saved.");
    router.refresh();
    setTimeout(() => setSuccess(null), 2000);
  }

  async function handleReceive() {
    const qty = parseInt(receiveQty, 10);
    if (!qty || qty <= 0) return;
    setIsReceiving(true);
    setError(null);
    setSuccess(null);
    const supabase = createClient();
    const newQty = onHand + qty;
    const { error: err } = await supabase
      .from("inventory_items")
      .update({
        quantity_on_hand: newQty,
        last_ordered_at: new Date().toISOString(),
      })
      .eq("id", inventoryId);
    setIsReceiving(false);
    if (err) { setError(err.message); return; }
    setOnHand(newQty);
    setReceiveQty("");
    setSuccess(`+${qty} received. New total: ${newQty}.`);
    router.refresh();
    setTimeout(() => setSuccess(null), 3000);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Stock display */}
      <div className={`rounded-xl px-4 py-4 ${statusStyle}`}>
        <p className="text-3xl font-bold">{onHand}</p>
        <p className="text-sm">on hand · reorder at {threshold}</p>
      </div>

      {/* Record purchase */}
      <div className="rounded-xl bg-white px-4 py-4 shadow-sm ring-1 ring-zinc-200">
        <p className="mb-3 text-sm font-medium text-zinc-700">Record Purchase</p>
        <div className="flex gap-2">
          <input
            type="number"
            min="1"
            value={receiveQty}
            onChange={(e) => setReceiveQty(e.target.value)}
            placeholder="Qty received"
            className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-[#324168] focus:ring-2 focus:ring-[#324168]/20"
          />
          <button
            type="button"
            onClick={handleReceive}
            disabled={isReceiving || !receiveQty}
            className="rounded-lg bg-[#324168] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isReceiving ? "…" : "Receive"}
          </button>
        </div>
      </div>

      {/* Edit threshold / on-hand (admin) */}
      {canEdit && (
        <div className="rounded-xl bg-white px-4 py-4 shadow-sm ring-1 ring-zinc-200">
          <p className="mb-3 text-sm font-medium text-zinc-700">Edit Stock Levels</p>
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-xs text-zinc-500">On hand</label>
              <input
                type="number"
                min="0"
                value={onHand}
                onChange={(e) => setOnHand(parseInt(e.target.value, 10) || 0)}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-[#324168]"
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-xs text-zinc-500">Reorder at</label>
              <input
                type="number"
                min="0"
                value={threshold}
                onChange={(e) => setThreshold(parseInt(e.target.value, 10) || 0)}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-[#324168]"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="mt-3 w-full rounded-lg border border-zinc-200 py-2 text-sm font-medium text-zinc-700 disabled:opacity-50"
          >
            {isSaving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      )}

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {success && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>}
    </div>
  );
}
