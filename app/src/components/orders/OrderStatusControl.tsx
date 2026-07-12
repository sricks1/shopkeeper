"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import StatusMenu from "@/components/organizer/StatusMenu";
import { createClient } from "@/lib/supabase/client";
import type { Enums } from "@/lib/types/database.types";

type TaskStatus = Enums<"task_status">;

// Inline status changer for an order on the Orders board — advance
// To Order → Ordered → Received without opening the task. Reuses the
// organizer StatusMenu with the order vocabulary.
export default function OrderStatusControl({
  taskId,
  status,
}: {
  taskId: string;
  status: TaskStatus;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState<TaskStatus>(status);
  const [failed, setFailed] = useState(false);

  async function change(next: TaskStatus) {
    const prev = current;
    setCurrent(next);
    setFailed(false);
    // Ask for the row back: an RLS-blocked or signed-out update returns NO
    // error but touches ZERO rows, which used to look like success and leave
    // the card silently stuck. Empty data = it didn't save.
    const { data, error } = await createClient()
      .from("staff_tasks")
      .update({ status: next })
      .eq("id", taskId)
      .select("id");
    if (error || !data || data.length === 0) {
      setCurrent(prev);
      setFailed(true);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <StatusMenu status={current} onChange={change} purchase />
      {failed && (
        <span className="text-[10px] font-medium leading-tight text-red-600">
          Couldn’t save — you may be signed out. Reload and check you’re signed in.
        </span>
      )}
    </div>
  );
}
