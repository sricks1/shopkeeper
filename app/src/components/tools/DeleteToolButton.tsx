"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

export default function DeleteToolButton({
  toolId,
  toolName,
}: {
  toolId: string;
  toolName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!window.confirm(`Permanently delete "${toolName}"? This cannot be undone.`)) return;

    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.from("tools").delete().eq("id", toolId);
    setLoading(false);

    if (err) {
      // Foreign key violation — tool has issues or repairs on record
      if (err.code === "23503") {
        setError(
          'This tool has issues or repairs on record and cannot be deleted. Set its status to "Retired" instead.',
        );
      } else {
        setError(err.message);
      }
      return;
    }

    router.push("/tools");
    router.refresh();
  }

  return (
    <div className="mt-8 border-t border-zinc-200 pt-6">
      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-zinc-400">Danger Zone</p>
      <Button variant="danger" className="w-full" onClick={handleDelete} disabled={loading}>
        <Trash2 size={15} />
        {loading ? "Deleting…" : "Delete Tool"}
      </Button>
      {error && (
        <p className="mt-3 rounded-card bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      )}
    </div>
  );
}
