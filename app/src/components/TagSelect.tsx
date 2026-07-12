"use client";

import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { TagChip } from "@/components/TagChip";
import type { TagRow } from "@/lib/organizer/types";

// A tag picker for use BEFORE a task exists (e.g. the new-task form). Unlike
// TaskTagsEditor it persists nothing — it just maintains a local selection and
// hands it back via onChange. Tags the user types that don't exist yet are
// represented with a sentinel id (`new:<name>`); the caller creates them for
// real on submit. Use isNewTag() to tell them apart.

const NEW_PREFIX = "new:";
export const isNewTag = (t: TagRow) => t.id.startsWith(NEW_PREFIX);

interface TagSelectProps {
  allTags: TagRow[];
  value: TagRow[];
  onChange: (next: TagRow[]) => void;
}

export default function TagSelect({ allTags, value, onChange }: TagSelectProps) {
  const [query, setQuery] = useState("");

  const selectedIds = useMemo(() => new Set(value.map((t) => t.id)), [value]);
  const selectedNames = useMemo(() => new Set(value.map((t) => t.name.toLowerCase())), [value]);

  const q = query.trim().toLowerCase();
  const suggestions = useMemo(
    () =>
      allTags.filter(
        (t) => !selectedIds.has(t.id) && (q === "" || t.name.toLowerCase().includes(q)),
      ),
    [allTags, selectedIds, q],
  );

  // Whether the typed text is a brand-new name (matches no existing or already-
  // selected tag, case-insensitively).
  const exactMatch = allTags.some((t) => t.name.toLowerCase() === q) || selectedNames.has(q);
  const canCreate = q.length > 0 && !exactMatch;

  const add = (tag: TagRow) => {
    onChange([...value, tag]);
    setQuery("");
  };

  const create = () => {
    const name = query.trim();
    if (!name || !canCreate) return;
    add({ id: `${NEW_PREFIX}${name}`, name, color: null });
  };

  const remove = (id: string) => onChange(value.filter((t) => t.id !== id));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {value.length > 0 ? (
          value.map((t) => (
            <TagChip key={t.id} name={t.name} color={t.color} onRemove={() => remove(t.id)} />
          ))
        ) : (
          <span className="text-sm text-zinc-400">No tags yet.</span>
        )}
      </div>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (canCreate) create();
            else if (suggestions.length === 1) add(suggestions[0]);
          }
        }}
        placeholder="Add a tag…"
        className="w-full rounded-field border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
      />

      {(suggestions.length > 0 || canCreate) && (
        <div className="flex flex-wrap gap-1.5">
          {canCreate && (
            <button
              type="button"
              onClick={create}
              className="inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-0.5 text-xs font-medium text-white"
            >
              <Plus size={12} />
              Create “{query.trim()}”
            </button>
          )}
          {suggestions.map((t) => (
            <button key={t.id} type="button" onClick={() => add(t)} className="cursor-pointer">
              <TagChip name={t.name} color={t.color} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
