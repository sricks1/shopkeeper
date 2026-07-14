"use client";

import { MapPin, Wrench } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ToolStatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import SearchInput from "@/components/ui/SearchInput";
import type { Enums } from "@/lib/types/database.types";

type ToolStatus = Enums<"tool_status">;

export interface ToolListItem {
  id: string;
  name: string;
  slug: string;
  status: ToolStatus;
  location: string | null;
  manufacturer: string | null;
  model: string | null;
}

export interface ToolSection {
  key: string;
  label: string;
  tools: ToolListItem[];
}

const STATUS_STRIP: Record<ToolStatus, string> = {
  active: "bg-emerald-400",
  down: "bg-red-500",
  retired: "bg-zinc-300",
};

function ToolRow({ tool }: { tool: ToolListItem }) {
  return (
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
  );
}

export default function ToolsList({ sections }: { sections: ToolSection[] }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const matches = useMemo(() => {
    if (!q) return null;
    const all = sections.flatMap((s) => s.tools);
    return all.filter((t) =>
      [t.name, t.manufacturer, t.model, t.location]
        .filter(Boolean)
        .some((field) => (field as string).toLowerCase().includes(q)),
    );
  }, [q, sections]);

  return (
    <div className="flex flex-col gap-4">
      <SearchInput value={query} onChange={setQuery} placeholder="Search tools…" />

      {matches ? (
        matches.length === 0 ? (
          <EmptyState icon={Wrench} title="No tools match your search" />
        ) : (
          <ul className="flex flex-col gap-2">
            {matches.map((tool) => (
              <li key={tool.id}>
                <ToolRow tool={tool} />
              </li>
            ))}
          </ul>
        )
      ) : (
        <div className="flex flex-col gap-6">
          {sections.map((section) => (
            <section key={section.key}>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-zinc-400">
                {section.label}
                <span className="ml-1.5 text-zinc-300">{section.tools.length}</span>
              </p>
              <ul className="flex flex-col gap-2">
                {section.tools.map((tool) => (
                  <li key={tool.id}>
                    <ToolRow tool={tool} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
