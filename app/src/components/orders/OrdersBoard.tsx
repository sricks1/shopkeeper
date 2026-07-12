import { OrderCard, type OrderRow } from "@/components/orders/OrderCard";
import { ORDER_COLUMN_ORDER, taskStatusLabel } from "@/components/StatusBadge";
import type { Enums } from "@/lib/types/database.types";

type TaskStatus = Enums<"task_status">;

const COLUMN_DOT: Record<TaskStatus, string> = {
  new: "bg-zinc-400",
  todo: "bg-zinc-400",
  in_progress: "bg-amber-500",
  done: "bg-emerald-500",
  deferred: "bg-zinc-300",
};

// The order pipeline: To Order → Ordered → Received (+ Deferred), same
// swipeable column layout as the tasks board.
export function OrdersBoard({ orders }: { orders: OrderRow[] }) {
  return (
    <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-2">
      {ORDER_COLUMN_ORDER.map((status) => {
        const colOrders = orders.filter((o) => o.status === status);
        return (
          <section
            key={status}
            className="flex w-[78vw] max-w-[20rem] shrink-0 snap-start flex-col gap-2 sm:w-72"
          >
            <div className="flex items-center gap-2 px-1">
              <span className={`h-2 w-2 rounded-full ${COLUMN_DOT[status]}`} />
              <h2 className="text-sm font-semibold text-zinc-700">
                {taskStatusLabel(status, true)}
              </h2>
              <span className="text-xs font-medium text-zinc-400">{colOrders.length}</span>
            </div>

            {colOrders.length === 0 ? (
              <div className="rounded-card border border-dashed border-zinc-200 px-3 py-6 text-center text-xs text-zinc-300">
                Empty
              </div>
            ) : (
              colOrders.map((o) => <OrderCard key={o.id} order={o} />)
            )}
          </section>
        );
      })}
    </div>
  );
}
