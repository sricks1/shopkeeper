"use client";

import { createClient } from "@/lib/supabase/client";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  consumableTypeId: string;
  inventoryItemId: string;
  consumableName: string;
}

export default function DeleteConsumableButton({ consumableTypeId, inventoryItemId, consumableName }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!window.confirm(`Permanently delete "${consumableName}"? This cannot be undone.`)) return;

    setLoading(true);
    setError(null);
    const supabase = createClient();

    // Delete inventory_items row first, then consumable_types
    await supabase.from("inventory_items").delete().eq("id", inventoryItemId);

    const { error: err } = await supabase
      .from("consumable_types")
      .delete()
      .eq("id", consumableTypeId);

    setLoading(false);

    if (err) {
      // FK violation — consumable has been used in a repair
      if (err.code === "23503") {
        setError("This consumable has been used in repairs and cannot be deleted — doing so would lose that history.");
      } else {
        setError(err.message);
      }
      return;
    }

    router.push("/inventory");
    router.refresh();
  }

  return (
    <div className="mt-8 border-t border-zinc-200 pt-6">
      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-zinc-400">Danger Zone</p>
      <button
        type="button"
        onClick={handleDelete}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
      >
        <Trash2 size={15} />
        {loading ? "Deleting…" : "Delete Consumable"}
      </button>
      {error && (
        <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      )}
    </div>
  );
}
