import { AlertTriangle, BellOff, MessageSquare, Package, UserPlus } from "lucide-react";
import Link from "next/link";
import { getCurrentStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/utils";
import AcknowledgeButton from "./AcknowledgeButton";

const NO_STAFF = "00000000-0000-0000-0000-000000000000";

function NotificationIcon({ type }: { type: string }) {
  if (type === "tool_down")
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100">
        <AlertTriangle size={15} className="text-red-500" />
      </div>
    );
  if (type === "task_assigned")
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100">
        <UserPlus size={15} className="text-blue-600" />
      </div>
    );
  if (type === "task_comment")
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100">
        <MessageSquare size={15} className="text-zinc-500" />
      </div>
    );
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100">
      <Package size={15} className="text-accent" />
    </div>
  );
}

function notificationTitle(type: string, payload: Record<string, string>): string {
  if (type === "tool_down") return `Tool down: ${payload.tool_name ?? "Unknown tool"}`;
  if (type === "reorder_needed")
    return `Reorder: ${payload.consumable_name ?? "Unknown consumable"}`;
  if (type === "task_assigned") return `Assigned: ${payload.task_name ?? "a task"}`;
  if (type === "task_comment") return `New comment on ${payload.task_name ?? "a task"}`;
  return "System notification";
}

function notificationDetail(type: string, payload: Record<string, string>): string | null {
  if (
    type === "reorder_needed" &&
    payload.quantity_on_hand != null &&
    payload.reorder_threshold != null
  ) {
    return `${payload.quantity_on_hand} on hand · threshold ${payload.reorder_threshold}`;
  }
  if (type === "task_assigned" && payload.assigner_name) {
    return `Assigned by ${payload.assigner_name}`;
  }
  if (type === "task_comment" && payload.author_name) {
    return `${payload.author_name}: ${payload.excerpt ?? ""}`;
  }
  return null;
}

function notificationHref(type: string, payload: Record<string, string>): string | null {
  if ((type === "task_assigned" || type === "task_comment") && payload.task_id) {
    return `/tasks/${payload.task_id}`;
  }
  return null;
}

export default async function NotificationsPage() {
  const supabase = await createClient();
  const staff = await getCurrentStaff();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .or(`recipient_id.is.null,recipient_id.eq.${staff?.id ?? NO_STAFF}`)
    .order("created_at", { ascending: false })
    .limit(50);

  const unread = notifications?.filter((n) => !n.acknowledged_at) ?? [];
  const read = notifications?.filter((n) => n.acknowledged_at) ?? [];

  return (
    <div className="px-4 pb-4 pt-5">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-zinc-900">Notifications</h1>
        <p className="text-sm text-zinc-500">
          {unread.length > 0 ? `${unread.length} unread` : "All caught up"}
        </p>
      </div>

      {/* Unread */}
      <section className="mb-6">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-zinc-400">New</p>
        {unread.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-6 py-10 text-center ring-1 ring-zinc-200">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100">
              <BellOff size={18} className="text-zinc-400" />
            </div>
            <p className="text-sm text-zinc-400">No new notifications</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {unread.map((n) => {
              const payload = (n.payload ?? {}) as Record<string, string>;
              const detail = notificationDetail(n.type, payload);
              const href = notificationHref(n.type, payload);
              return (
                <li
                  key={n.id}
                  className="flex items-center gap-3 rounded-xl bg-white px-4 py-3.5 shadow-sm ring-1 ring-zinc-200"
                >
                  <NotificationIcon type={n.type} />
                  <div className="min-w-0 flex-1">
                    {href ? (
                      <Link
                        href={href}
                        className="text-sm font-semibold text-zinc-800 hover:underline"
                      >
                        {notificationTitle(n.type, payload)}
                      </Link>
                    ) : (
                      <p className="text-sm font-semibold text-zinc-800">
                        {notificationTitle(n.type, payload)}
                      </p>
                    )}
                    {detail && <p className="mt-0.5 text-xs text-zinc-500">{detail}</p>}
                    <p className="mt-1 text-xs text-zinc-400">{timeAgo(n.created_at)}</p>
                  </div>
                  <AcknowledgeButton id={n.id} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Dismissed */}
      {read.length > 0 && (
        <section>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-zinc-400">
            Dismissed
          </p>
          <ul className="flex flex-col gap-2">
            {read.map((n) => {
              const payload = (n.payload ?? {}) as Record<string, string>;
              const detail = notificationDetail(n.type, payload);
              const href = notificationHref(n.type, payload);
              return (
                <li
                  key={n.id}
                  className="flex items-center gap-3 rounded-xl bg-white px-4 py-3.5 ring-1 ring-zinc-200 opacity-50"
                >
                  <NotificationIcon type={n.type} />
                  <div className="min-w-0 flex-1">
                    {href ? (
                      <Link
                        href={href}
                        className="text-sm font-medium text-zinc-700 hover:underline"
                      >
                        {notificationTitle(n.type, payload)}
                      </Link>
                    ) : (
                      <p className="text-sm font-medium text-zinc-700">
                        {notificationTitle(n.type, payload)}
                      </p>
                    )}
                    {detail && <p className="mt-0.5 text-xs text-zinc-500">{detail}</p>}
                    <p className="mt-1 text-xs text-zinc-400">{timeAgo(n.created_at)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
