import { Package } from "lucide-react";
import Link from "next/link";
import OrderStatusControl from "@/components/orders/OrderStatusControl";
import { TaskPriorityBadge, taskStatusLabel } from "@/components/StatusBadge";
import type { Enums } from "@/lib/types/database.types";
import { formatDate, isOverdue } from "@/lib/utils";

type TaskStatus = Enums<"task_status">;

export interface OrderRow {
  id: string;
  name: string;
  status: TaskStatus;
  priority: Enums<"task_priority">;
  date_needed: string | null;
  assigneeName: string | null;
  consumableName: string | null;
  inventoryId: string | null;
}

// The shopping list, top to bottom: To Order → Ordered, then Deferred and
// recently Received only when they have something to show. Sections without
// an emptyText hide entirely when empty.
const SECTIONS: {
  key: string;
  label: string;
  statuses: TaskStatus[];
  emptyText?: string;
}[] = [
  {
    key: "to-order",
    label: taskStatusLabel("new", true),
    statuses: ["new", "todo"],
    emptyText: "Nothing to order",
  },
  {
    key: "ordered",
    label: taskStatusLabel("in_progress", true),
    statuses: ["in_progress"],
    emptyText: "Nothing on order",
  },
  { key: "deferred", label: taskStatusLabel("deferred", true), statuses: ["deferred"] },
  { key: "received", label: taskStatusLabel("done", true), statuses: ["done"] },
];

// One order on the list: title links to the underlying task, the linked
// consumable (if any) links to its inventory item, and the inline status
// control advances To Order → Ordered → Received without leaving the list.
function OrderListRow({ order }: { order: OrderRow }) {
  const overdue = isOverdue(order.date_needed, order.status);
  return (
    <div className="flex items-center justify-between gap-3 rounded-card bg-white px-3.5 py-2.5 shadow-sm ring-1 ring-zinc-200">
      <div className="min-w-0 flex-1">
        <Link
          href={`/tasks/${order.id}?from=orders`}
          className="block truncate text-sm font-medium leading-snug text-zinc-900 hover:underline"
        >
          {order.name}
        </Link>
        {order.inventoryId && (
          <Link
            href={`/inventory/${order.inventoryId}`}
            className="mt-0.5 flex items-center gap-1 text-xs font-medium text-brand hover:underline"
          >
            <Package size={12} className="shrink-0" />
            <span className="truncate">{order.consumableName}</span>
          </Link>
        )}
        {(order.assigneeName || order.date_needed) && (
          <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-400">
            {order.assigneeName && <span className="truncate">{order.assigneeName}</span>}
            {order.date_needed && (
              <span className={`shrink-0 ${overdue ? "font-medium text-red-600" : ""}`}>
                {formatDate(order.date_needed)}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <OrderStatusControl taskId={order.id} status={order.status} />
        <TaskPriorityBadge priority={order.priority} />
      </div>
    </div>
  );
}

// The order pipeline as a plain vertical shopping list — grab it at the desk,
// see everything to order at a glance. Replaces the swipeable kanban board.
export function OrdersList({ orders }: { orders: OrderRow[] }) {
  return (
    <div className="flex flex-col gap-6">
      {SECTIONS.map((section) => {
        const sectionOrders = orders.filter((o) => section.statuses.includes(o.status));
        if (sectionOrders.length === 0 && !section.emptyText) return null;
        return (
          <section key={section.key}>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-zinc-400">
              {section.label} <span className="font-medium">{sectionOrders.length}</span>
            </p>
            {sectionOrders.length === 0 ? (
              <div className="rounded-card border border-dashed border-zinc-200 px-3.5 py-3 text-center text-xs text-zinc-300">
                {section.emptyText}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {sectionOrders.map((o) => (
                  <OrderListRow key={o.id} order={o} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
