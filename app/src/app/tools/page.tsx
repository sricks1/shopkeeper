import AppShell from "@/components/AppShell";
import { ToolStatusBadge } from "@/components/StatusBadge";
import { canManageTools, getCurrentStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/types/database.types";
import { MapPin, Plus, Wrench } from "lucide-react";
import Link from "next/link";

type ToolStatus = Enums<"tool_status">;

const STATUS_STRIP: Record<ToolStatus, string> = {
  active: "bg-emerald-400",
  down: "bg-red-500",
  retired: "bg-zinc-300",
};

export default async function ToolsPage() {
  const supabase = await createClient();
  const staff = await getCurrentStaff();

  const { data: tools } = await supabase
    .from("tools")
    .select("id, name, slug, status, location, manufacturer, model")
    .order("name");

  const downCount = tools?.filter((t) => t.status === "down").length ?? 0;

  return (
    <AppShell>
      <div className="px-4 pb-4 pt-5">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Shop Tools</h1>
            <p className="text-sm text-zinc-500">
              {tools?.length ?? 0} tools
              {downCount > 0 && (
                <span className="ml-2 font-medium text-red-600">· {downCount} down</span>
              )}
            </p>
          </div>
          {canManageTools(staff?.role) && (
            <Link
              href="/tools/new"
              className="flex items-center gap-1.5 rounded-xl bg-[#324168] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#263352] active:bg-[#1e2840]"
            >
              <Plus size={16} />
              Add Tool
            </Link>
          )}
        </div>

        {/* Tool list */}
        {!tools?.length ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-zinc-200 bg-white px-6 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100">
              <Wrench size={22} className="text-zinc-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-600">No tools yet</p>
              {canManageTools(staff?.role) && (
                <Link href="/tools/new" className="mt-1 text-sm text-[#324168] underline">
                  Add the first one
                </Link>
              )}
            </div>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {tools.map((tool) => (
              <li key={tool.id}>
                <Link
                  href={`/tools/${tool.slug}`}
                  className="flex items-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-zinc-200 transition-colors active:bg-zinc-50"
                >
                  <div className={`w-1 shrink-0 self-stretch ${STATUS_STRIP[tool.status]}`} />
                  <div className="flex flex-1 items-center justify-between px-4 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-zinc-900">{tool.name}</p>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-400">
                        {tool.manufacturer && <span className="truncate">{tool.manufacturer}</span>}
                        {tool.manufacturer && tool.location && <span>·</span>}
                        {tool.location && (
                          <span className="flex items-center gap-0.5 truncate">
                            <MapPin size={10} />
                            {tool.location}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="ml-3 shrink-0">
                      <ToolStatusBadge status={tool.status} />
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
