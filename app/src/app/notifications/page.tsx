import AppShell from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/utils";
import { AlertTriangle, BellOff, Package } from "lucide-react";
import AcknowledgeButton from "./AcknowledgeButton";

function NotificationIcon({ type }: { type: string }) {
  if (type === "tool_down") return <AlertTriangle size={18} className="text-red-500" />;
  return <Package size={18} className="text-[#e06829]" />;
}

function notificationTitle(type: string, payload: Record<string, string>): string {
  if (type === "tool_down") return `Tool down: ${payload.tool_name ?? "Unknown tool"}`;
  if (type === "reorder_needed") return `Reorder needed: ${payload.consumable_name ?? "Unknown consumable"}`;
  return "System notification";
}

function notificationDetail(type: string, payload: Record<string, string>): string | null {
  if (type === "reorder_needed" && payload.quantity_on_hand != null && payload.reorder_threshold != null) {
    return `${payload.quantity_on_hand} on hand / threshold ${payload.reorder_threshold}`;
  }
  return null;
}

export default async function NotificationsPage() {
  const supabase = await createClient();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  const unread = notifications?.filter((n) => !n.acknowledged_at) ?? [];
  const read = notifications?.filter((n) => n.acknowledged_at) ?? [];

  return (
    <AppShell>
      <div className="px-4 pb-4 pt-6">
        <h1 className="mb-4 text-xl font-bold text-zinc-900">Notifications</h1>

        {/* Unread */}
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            New {unread.length > 0 && `(${unread.length})`}
          </h2>
          {unread.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl bg-white px-4 py-8 text-center ring-1 ring-zinc-200">
              <BellOff size={24} className="text-zinc-300" />
              <p className="text-sm text-zinc-400">No new notifications</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {unread.map((n) => {
                const payload = (n.payload ?? {}) as Record<string, string>;
                const detail = notificationDetail(n.type, payload);
                return (
                  <li
                    key={n.id}
                    className="flex items-start gap-3 rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-zinc-200"
                  >
                    <div className="mt-0.5 shrink-0">
                      <NotificationIcon type={n.type} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-800">
                        {notificationTitle(n.type, payload)}
                      </p>
                      {detail && (
                        <p className="mt-0.5 text-xs text-zinc-500">{detail}</p>
                      )}
                      <p className="mt-1 text-xs text-zinc-400">{timeAgo(n.created_at)}</p>
                    </div>
                    <AcknowledgeButton id={n.id} />
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Read */}
        {read.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Dismissed
            </h2>
            <ul className="flex flex-col gap-2">
              {read.map((n) => {
                const payload = (n.payload ?? {}) as Record<string, string>;
                const detail = notificationDetail(n.type, payload);
                return (
                  <li
                    key={n.id}
                    className="flex items-start gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-zinc-200 opacity-50"
                  >
                    <div className="mt-0.5 shrink-0">
                      <NotificationIcon type={n.type} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-700">
                        {notificationTitle(n.type, payload)}
                      </p>
                      {detail && (
                        <p className="mt-0.5 text-xs text-zinc-500">{detail}</p>
                      )}
                      <p className="mt-1 text-xs text-zinc-400">{timeAgo(n.created_at)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </AppShell>
  );
}
