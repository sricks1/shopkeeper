import { TaskPriorityBadge } from "@/components/StatusBadge";
import type { TaskPriority } from "@/lib/organizer/types";
import { Lock, ShoppingCart } from "lucide-react";

// The "system flag" cluster for a task — priority, To Buy, Personal — rendered
// as icons only (color + tooltip), so it reads consistently and compactly in
// both the pool cards and the dense folder rows. Worded tag chips render
// separately; keeping these icon-only is what keeps the two languages distinct.
export default function TaskFlags({
  priority,
  isPurchase,
  personal,
}: {
  priority: TaskPriority;
  isPurchase: boolean;
  personal: boolean;
}) {
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      <TaskPriorityBadge priority={priority} />
      {isPurchase && (
        <span title="Purchasing task — linked to a consumable" className="text-amber-600">
          <ShoppingCart size={13} />
        </span>
      )}
      {personal && (
        <span title="Personal task — only you can see it" className="text-violet-600">
          <Lock size={13} />
        </span>
      )}
    </span>
  );
}
