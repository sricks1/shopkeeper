"use client";

import { createClient } from "@/lib/supabase/client";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Header-level delete, kept out of the edit field flow. Confirms, then removes
// the task (comments cascade) and returns to the task list.
export default function DeleteTaskButton({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this task? Its comments will be removed too.")) return;
    setBusy(true);
    const { error } = await createClient().from("staff_tasks").delete().eq("id", taskId);
    if (error) {
      alert(`Couldn't delete: ${error.message}`);
      setBusy(false);
      return;
    }
    router.push("/tasks");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={busy}
      title="Delete task"
      aria-label="Delete task"
      className="shrink-0 rounded-lg p-2 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
    >
      <Trash2 size={18} />
    </button>
  );
}
