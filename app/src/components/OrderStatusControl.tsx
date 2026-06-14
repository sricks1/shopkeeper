"use client";

import StatusMenu from "@/components/organizer/StatusMenu";
import { createClient } from "@/lib/supabase/client";
import type { Enums } from "@/lib/types/database.types";
import { useRouter } from "next/navigation";
import { useState } from "react";

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

  async function change(next: TaskStatus) {
    const prev = current;
    setCurrent(next);
    const { error } = await createClient()
      .from("staff_tasks")
      .update({ status: next })
      .eq("id", taskId);
    if (error) {
      setCurrent(prev);
      return;
    }
    router.refresh();
  }

  return <StatusMenu status={current} onChange={change} purchase />;
}
