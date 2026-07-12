"use client";

import { CheckCircle, Wrench } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, buttonClasses } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

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
      <Link href={`/tools/${toolSlug}/repairs/new?issue=${issueId}`} className={buttonClasses()}>
        <Wrench size={15} />
        Log a Repair
      </Link>

      <Button variant="outline" onClick={handleQuickResolve} disabled={isResolving}>
        <CheckCircle size={15} />
        {isResolving ? "Resolving…" : "Mark Resolved (no repair)"}
      </Button>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
