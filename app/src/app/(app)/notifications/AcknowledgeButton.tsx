"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
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
    <Button variant="outline" size="sm" onClick={handleAck} disabled={loading} className="shrink-0">
      {loading ? "..." : "Dismiss"}
    </Button>
  );
}
