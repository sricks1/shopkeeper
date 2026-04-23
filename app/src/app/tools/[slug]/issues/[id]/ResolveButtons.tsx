"use client";

import { createClient } from "@/lib/supabase/client";
import { CheckCircle, Wrench } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ResolveButtons({
  issueId,
  toolSlug,
}: {
  issueId: string;
  toolSlug: string;
}) {
  const router = useRouter();
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleQuickResolve() {
    setIsResolving(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase
      .from("issues")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
      })
      .eq("id", issueId);

    if (err) {
      setError(err.message);
      setIsResolving(false);
      return;
    }

    router.push(`/tools/${toolSlug}`);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <Link
        href={`/tools/${toolSlug}/repairs/new?issue=${issueId}`}
        className="flex items-center justify-center gap-2 rounded-lg bg-[#324168] py-2.5 text-sm font-semibold text-white"
      >
        <Wrench size={15} />
        Log a Repair
      </Link>

      <button
        type="button"
        onClick={handleQuickResolve}
        disabled={isResolving}
        className="flex items-center justify-center gap-2 rounded-lg border border-zinc-200 py-2.5 text-sm font-medium text-zinc-700 disabled:opacity-60"
      >
        <CheckCircle size={15} />
        {isResolving ? "Resolving…" : "Mark Resolved (no repair)"}
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
