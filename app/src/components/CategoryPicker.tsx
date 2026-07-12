"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface CategoryOption {
  value: string;
  label: string;
}

interface CategoryPickerProps {
  categories: CategoryOption[];
  value: string;
  onChange: (value: string) => void;
}

// Match the existing snake_case category values so display ("_" → " ") stays consistent.
function toValue(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const inputCls =
  "w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

export default function CategoryPicker({
  categories: initial,
  value,
  onChange,
}: CategoryPickerProps) {
  const [categories, setCategories] = useState<CategoryOption[]>(initial);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addCategory() {
    const label = newLabel.trim();
    const val = toValue(label);
    if (!val) {
      setError("Enter a valid category name.");
      return;
    }

    // Already exists? Just select it.
    const existing = categories.find((c) => c.value === val);
    if (existing) {
      onChange(existing.value);
      setAdding(false);
      setNewLabel("");
      return;
    }

    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase
      .from("consumable_categories")
      .insert({ value: val, label });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }

    const next = [...categories, { value: val, label }].sort((a, b) =>
      a.label.localeCompare(b.label),
    );
    setCategories(next);
    onChange(val);
    setAdding(false);
    setNewLabel("");
  }

  if (adding) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="New category name"
            className={inputCls}
          />
          <button
            type="button"
            onClick={addCategory}
            disabled={busy || !newLabel.trim()}
            className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "…" : "Add"}
          </button>
          <button
            type="button"
            onClick={() => {
              setAdding(false);
              setNewLabel("");
              setError(null);
            }}
            className="shrink-0 rounded-lg border border-zinc-200 px-3 text-sm font-medium text-zinc-600"
          >
            Cancel
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
        {categories.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="self-start text-sm font-medium text-brand underline"
      >
        + New category
      </button>
    </div>
  );
}
