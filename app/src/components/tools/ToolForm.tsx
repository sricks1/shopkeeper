"use client";

import { createClient } from "@/lib/supabase/client";
import type { Enums, Tables } from "@/lib/types/database.types";
import { slugify } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

type ToolStatus = Enums<"tool_status">;
type Tool = Tables<"tools">;

interface ToolFormProps {
  tool?: Tool;
}

const STATUS_OPTIONS: { value: ToolStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "down", label: "Down" },
  { value: "retired", label: "Retired" },
];

export default function ToolForm({ tool }: ToolFormProps) {
  const router = useRouter();
  const isEditing = !!tool;

  const [name, setName] = useState(tool?.name ?? "");
  const [slug, setSlug] = useState(tool?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(isEditing);
  const [manufacturer, setManufacturer] = useState(tool?.manufacturer ?? "");
  const [model, setModel] = useState(tool?.model ?? "");
  const [serial, setSerial] = useState(tool?.serial ?? "");
  const [location, setLocation] = useState(tool?.location ?? "");
  const [status, setStatus] = useState<ToolStatus>(tool?.status ?? "active");
  const [purchaseDate, setPurchaseDate] = useState(tool?.purchase_date ?? "");
  const [manualUrl, setManualUrl] = useState(tool?.manual_url ?? "");
  const [notes, setNotes] = useState(tool?.notes ?? "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate slug from name when adding a new tool
  useEffect(() => {
    if (!slugEdited && !isEditing) {
      setSlug(slugify(name));
    }
  }, [name, slugEdited, isEditing]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const supabase = createClient();
    const payload = {
      name: name.trim(),
      slug: slug.trim(),
      manufacturer: manufacturer.trim() || null,
      model: model.trim() || null,
      serial: serial.trim() || null,
      location: location.trim() || null,
      status,
      purchase_date: purchaseDate || null,
      manual_url: manualUrl.trim() || null,
      notes: notes.trim() || null,
    };

    if (isEditing) {
      const { error: err } = await supabase
        .from("tools")
        .update(payload)
        .eq("id", tool.id);
      if (err) {
        setError(err.message);
        setIsLoading(false);
        return;
      }
    } else {
      const { error: err } = await supabase.from("tools").insert(payload);
      if (err) {
        setError(
          err.code === "23505"
            ? "A tool with that slug already exists. Try a different name or edit the slug."
            : err.message,
        );
        setIsLoading(false);
        return;
      }
    }

    router.push(`/tools/${payload.slug}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Name */}
      <Field label="Name *">
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputCls}
          placeholder="Grizzly 14-inch Bandsaw"
        />
      </Field>

      {/* Slug */}
      <Field label="URL slug *" hint="Used in QR codes — lowercase letters, numbers, hyphens only">
        <input
          type="text"
          required
          pattern="[a-z0-9-]+"
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value);
            setSlugEdited(true);
          }}
          className={inputCls}
          placeholder="grizzly-bandsaw"
        />
      </Field>

      {/* Manufacturer / Model */}
      <div className="flex gap-3">
        <Field label="Manufacturer" className="flex-1">
          <input
            type="text"
            value={manufacturer}
            onChange={(e) => setManufacturer(e.target.value)}
            className={inputCls}
            placeholder="Grizzly"
          />
        </Field>
        <Field label="Model" className="flex-1">
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className={inputCls}
            placeholder="G0555"
          />
        </Field>
      </div>

      {/* Serial / Location */}
      <div className="flex gap-3">
        <Field label="Serial number" className="flex-1">
          <input
            type="text"
            value={serial}
            onChange={(e) => setSerial(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Location" className="flex-1">
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className={inputCls}
            placeholder="East wall"
          />
        </Field>
      </div>

      {/* Status */}
      <Field label="Status">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as ToolStatus)}
          className={inputCls}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>

      {/* Purchase date */}
      <Field label="Purchase date">
        <input
          type="date"
          value={purchaseDate}
          onChange={(e) => setPurchaseDate(e.target.value)}
          className={inputCls}
        />
      </Field>

      {/* Manual URL */}
      <Field label="Manual URL">
        <input
          type="url"
          value={manualUrl}
          onChange={(e) => setManualUrl(e.target.value)}
          className={inputCls}
          placeholder="https://..."
        />
      </Field>

      {/* Notes */}
      <Field label="Notes">
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={inputCls}
          placeholder="Any additional details…"
        />
      </Field>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 rounded-lg border border-zinc-200 py-2.5 text-sm font-medium text-zinc-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 rounded-lg bg-[#324168] py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {isLoading ? "Saving…" : isEditing ? "Save Changes" : "Add Tool"}
        </button>
      </div>
    </form>
  );
}

const inputCls =
  "w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-[#324168] focus:ring-2 focus:ring-[#324168]/20";

function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <label className="text-sm font-medium text-zinc-700">{label}</label>
      {children}
      {hint && <p className="text-xs text-zinc-400">{hint}</p>}
    </div>
  );
}
