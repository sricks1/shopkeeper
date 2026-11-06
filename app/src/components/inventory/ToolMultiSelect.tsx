"use client";

import { Check, Search } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/Input";

export interface ToolOption {
  id: string;
  name: string;
}

// Multi-select checklist of tools, used from the consumable forms to link a
// consumable/part to the tools that use it (the consumable side of the
// `tool_consumables` link — the tool side lives in `ManageConsumables`).
// Controlled: `value` is the selected tool ids, `onChange` gets the new set.
export default function ToolMultiSelect({
  tools,
  value,
  onChange,
}: {
  tools: ToolOption[];
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const [search, setSearch] = useState("");
  const selected = new Set(value);
  const filtered = tools.filter(
    (t) => search === "" || t.name.toLowerCase().includes(search.toLowerCase()),
  );

  function toggle(id: string) {
    const next = new Set(value);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onChange([...next]);
  }

  if (tools.length === 0) {
    return <p className="text-sm text-zinc-400">No tools to link yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tools…"
          className="pl-8"
        />
      </div>
      <div className="flex max-h-64 flex-col gap-1 overflow-y-auto rounded-field border border-zinc-200 p-1">
        {filtered.length === 0 ? (
          <p className="px-2 py-3 text-sm text-zinc-400">No tools match.</p>
        ) : (
          filtered.map((t) => {
            const on = selected.has(t.id);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => toggle(t.id)}
                aria-pressed={on}
                className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors ${
                  on ? "bg-brand/10 text-brand" : "text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                    on ? "border-brand bg-brand text-white" : "border-zinc-300"
                  }`}
                >
                  {on && <Check size={11} strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1 truncate">{t.name}</span>
              </button>
            );
          })
        )}
      </div>
      {value.length > 0 && (
        <p className="px-1 text-xs text-zinc-400">
          {value.length} tool{value.length === 1 ? "" : "s"} selected
        </p>
      )}
    </div>
  );
}
