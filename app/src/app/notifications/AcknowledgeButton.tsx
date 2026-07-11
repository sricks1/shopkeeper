"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AcknowledgeButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleAck() {
    setLoading(true);
    const supabase = createClient();
    await supabase
      .from("notifications")
      .update({ acknowledged_at: new Date().toISOString() })
      .eq("id", id);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleAck}
      disabled={loading}
      className="shrink-0 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-50"
    >
      {loading ? "..." : "Dismiss"}
    </button>
  );
}
