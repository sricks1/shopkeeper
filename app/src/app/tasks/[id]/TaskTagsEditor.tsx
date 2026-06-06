"use client";

import { TagChip } from "@/components/TagChip";
import { applyTag, createTag, removeTag } from "@/lib/organizer/api";
import type { TagRow } from "@/lib/organizer/types";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

interface TaskTagsEditorProps {
  taskId: string;
  allTags: TagRow[];
  initialTagIds: string[];
}

export default function TaskTagsEditor({ taskId, allTags, initialTagIds }: TaskTagsEditorProps) {
  const router = useRouter();
  const [tags, setTags] = useState<TagRow[]>(allTags);
  const [selected, setSelected] = useState<string[]>(initialTagIds);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTags = useMemo(
    () => tags.filter((t) => selected.includes(t.id)),
    [tags, selected],
  );

  const q = query.trim().toLowerCase();
  const suggestions = useMemo(
    () =>
      tags.filter(
        (t) => !selected.includes(t.id) && (q === "" || t.name.toLowerCase().includes(q)),
      ),
    [tags, selected, q],
  );

  // Whether the typed text is a brand-new name (no existing tag matches exactly).
  const exactMatch = tags.some((t) => t.name.toLowerCase() === q);
  const canCreate = q.length > 0 && !exactMatch;

  async function add(tagId: string) {
    setError(null);
    setSelected((s) => [...s, tagId]);
    setQuery("");
    try {
      await applyTag(taskId, tagId);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setSelected((s) => s.filter((id) => id !== tagId));
    }
  }

  async function create() {
    if (!canCreate || busy) return;
    setBusy(true);
    setError(null);
    try {
      const tag = await createTag(query.trim());
      setTags((ts) => (ts.some((t) => t.id === tag.id) ? ts : [...ts, tag]));
      setSelected((s) => (s.includes(tag.id) ? s : [...s, tag.id]));
      setQuery("");
      await applyTag(taskId, tag.id);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(tagId: string) {
    setError(null);
    setSelected((s) => s.filter((id) => id !== tagId));
    try {
      await removeTag(taskId, tagId);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setSelected((s) => [...s, tagId]);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-zinc-700">Tags</p>

      <div className="flex flex-wrap gap-1.5">
        {selectedTags.length > 0 ? (
          selectedTags.map((t) => (
            <TagChip key={t.id} name={t.name} color={t.color} onRemove={() => remove(t.id)} />
          ))
        ) : (
          <span className="text-sm text-zinc-400">No tags yet.</span>
        )}
      </div>

      <div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (canCreate) create();
              else if (suggestions.length === 1) add(suggestions[0].id);
            }
          }}
          placeholder="Add a tag…"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-[#324168] focus:ring-2 focus:ring-[#324168]/20"
        />

        {(suggestions.length > 0 || canCreate) && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {canCreate && (
              <button
                type="button"
                onClick={create}
                disabled={busy}
                className="inline-flex items-center gap-1 rounded-full bg-[#324168] px-2.5 py-0.5 text-xs font-medium text-white disabled:opacity-60"
              >
                <Plus size={12} />
                Create “{query.trim()}”
              </button>
            )}
            {suggestions.map((t) => (
              <button key={t.id} type="button" onClick={() => add(t.id)} className="cursor-pointer">
                <TagChip name={t.name} color={t.color} />
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
