import { MapPin, Plus, Wrench } from "lucide-react";
import Link from "next/link";
import { ToolStatusBadge } from "@/components/StatusBadge";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { canManageTools, getCurrentStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/types/database.types";

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
    <div className="px-4 pb-4 pt-4">
      <PageHeader
        title="Shop Tools"
        subtitle={
          <>
            {tools?.length ?? 0} tools
            {downCount > 0 && (
              <span className="ml-2 font-medium text-red-600">· {downCount} down</span>
            )}
          </>
        }
        action={
          canManageTools(staff?.role) && (
            <Link href="/tools/new" className={buttonClasses()}>
              <Plus size={16} />
              Add Tool
            </Link>
          )
        }
      />

      {/* Tool list */}
      {!tools?.length ? (
        <EmptyState
          icon={Wrench}
          title="No tools yet"
          action={
            canManageTools(staff?.role)
              ? { label: "Add the first one", href: "/tools/new" }
              : undefined
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {tools.map((tool) => (
            <li key={tool.id}>
              <Link
                href={`/tools/${tool.slug}`}
                className="flex items-center overflow-hidden rounded-card bg-white shadow-sm ring-1 ring-zinc-200 transition-colors active:bg-zinc-50"
              >
                <div className={`w-1 shrink-0 self-stretch ${STATUS_STRIP[tool.status]}`} />
                <div className="flex flex-1 items-center justify-between px-3.5 py-2.5">
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
  );
}
