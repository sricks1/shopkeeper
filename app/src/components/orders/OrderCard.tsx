import { CalendarClock, Package, User } from "lucide-react";
import Link from "next/link";
import OrderStatusControl from "@/components/orders/OrderStatusControl";
import { TaskPriorityBadge } from "@/components/StatusBadge";
import type { Enums } from "@/lib/types/database.types";
import { formatDate, isOverdue } from "@/lib/utils";

export interface OrderRow {
  id: string;
  name: string;
  status: Enums<"task_status">;
  priority: Enums<"task_priority">;
  date_needed: string | null;
  assigneeName: string | null;
  consumableName: string | null;
  inventoryId: string | null;
}

// One order on the board: title links to the underlying task, the linked
// consumable (if any) links to its inventory item, and the inline status
// control advances To Order → Ordered → Received without leaving the board.
export function OrderCard({ order }: { order: OrderRow }) {
  const overdue = isOverdue(order.date_needed, order.status);
  return (
    <div className="flex flex-col gap-2 rounded-card bg-white px-3.5 py-3 shadow-sm ring-1 ring-zinc-200">
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/tasks/${order.id}?from=orders`}
          className="min-w-0 break-words text-sm font-semibold leading-snug text-zinc-900 hover:underline"
        >
          {order.name}
        </Link>
        <span className="shrink-0 pt-0.5">
          <TaskPriorityBadge priority={order.priority} />
        </span>
      </div>

      {order.inventoryId && (
        <Link
          href={`/inventory/${order.inventoryId}`}
          className="flex items-center gap-1.5 text-xs font-medium text-brand hover:underline"
        >
          <Package size={12} className="shrink-0" />
          <span className="truncate">{order.consumableName}</span>
        </Link>
      )}

      <div className="flex items-center justify-between gap-2">
        <OrderStatusControl taskId={order.id} status={order.status} />
        <div className="flex min-w-0 items-center gap-2 text-xs text-zinc-400">
          <span className="flex min-w-0 items-center gap-1">
            <User size={11} className="shrink-0" />
            <span className="truncate">{order.assigneeName ?? "Unassigned"}</span>
          </span>
          {order.date_needed && (
            <span
              className={`flex shrink-0 items-center gap-1 ${overdue ? "font-medium text-red-600" : ""}`}
            >
              <CalendarClock size={11} />
              {formatDate(order.date_needed)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
