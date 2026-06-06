"use client";

import { createClient } from "@/lib/supabase/client";
import { ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface OrderButtonProps {
  consumableTypeId: string;
  name: string;
  vendor: string | null;
  vendorUrl: string | null;
  sku: string | null;
  onHand: number;
  threshold: number;
}

export default function OrderButton({
  consumableTypeId,
  name,
  vendor,
  vendorUrl,
  sku,
  onHand,
  threshold,
}: OrderButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createOrderTask() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const notes = [
      vendor ? `Vendor: ${vendor}` : null,
      vendorUrl ? `Link: ${vendorUrl}` : null,
      sku ? `SKU: ${sku}` : null,
      `On hand: ${onHand} · reorder at ${threshold}`,
    ]
      .filter(Boolean)
      .join("\n");

    const { data: task, error: err } = await supabase
      .from("staff_tasks")
      .insert({
        name: `Order: ${name}`,
        notes,
        status: "todo",
        consumable_type_id: consumableTypeId,
        created_by: user?.id ?? null,
      })
      .select("id")
      .single();

    setBusy(false);
    if (err || !task) {
      setError(err?.message ?? "Failed to create order task.");
      return;
    }
    router.push(`/tasks/${task.id}`);
    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        onClick={createOrderTask}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#e06829] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#c55a22] disabled:opacity-60"
      >
        <ShoppingCart size={16} />
        {busy ? "Creating order…" : "Order this"}
      </button>
      {error && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
    </div>
  );
}
