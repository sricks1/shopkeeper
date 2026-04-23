import AppShell from "@/components/AppShell";
import { ToolStatusBadge } from "@/components/StatusBadge";
import { canManageTools, getCurrentStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MapPin, Plus } from "lucide-react";
import Link from "next/link";

export default async function ToolsPage() {
  const supabase = await createClient();
  const staff = await getCurrentStaff();

  const { data: tools } = await supabase
    .from("tools")
    .select("id, name, slug, status, location, manufacturer, model")
    .order("name");

  return (
    <AppShell>
      <div className="px-4 pb-4 pt-6">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Shop Tools</h1>
            <p className="text-sm text-zinc-500">{tools?.length ?? 0} tools</p>
          </div>
          {canManageTools(staff?.role) && (
            <Link
              href="/tools/new"
              className="flex items-center gap-1.5 rounded-lg bg-[#324168] px-3 py-2 text-sm font-medium text-white"
            >
              <Plus size={16} />
              Add Tool
            </Link>
          )}
        </div>

        {/* Tool list */}
        {!tools?.length ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center">
            <p className="text-sm font-medium text-zinc-500">No tools yet.</p>
            {canManageTools(staff?.role) && (
              <Link href="/tools/new" className="mt-2 text-sm text-[#324168] underline">
                Add the first one
              </Link>
            )}
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {tools.map((tool) => (
              <li key={tool.id}>
                <Link
                  href={`/tools/${tool.slug}`}
                  className="flex items-center justify-between rounded-xl bg-white px-4 py-3.5 shadow-sm ring-1 ring-zinc-200 transition-colors active:bg-zinc-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-zinc-900">{tool.name}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-400">
                      {tool.manufacturer && (
                        <span className="truncate">{tool.manufacturer}</span>
                      )}
                      {tool.manufacturer && tool.location && (
                        <span>·</span>
                      )}
                      {tool.location && (
                        <span className="flex items-center gap-0.5 truncate">
                          <MapPin size={11} />
                          {tool.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="ml-3 shrink-0">
                    <ToolStatusBadge status={tool.status} />
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
