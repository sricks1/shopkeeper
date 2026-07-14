"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import PhotoUploader, { type ExistingPhoto, type PhotoSelection } from "@/components/PhotoUploader";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { uploadPhotos } from "@/lib/photos";
import { createClient } from "@/lib/supabase/client";
import type { Enums, Tables } from "@/lib/types/database.types";
import { slugify } from "@/lib/utils";

type ToolStatus = Enums<"tool_status">;
type Tool = Tables<"tools">;

interface ToolFormProps {
  tool?: Tool;
  toolTypes: { value: string; label: string }[];
  existingPhotos?: ExistingPhoto[];
}

const STATUS_OPTIONS: { value: ToolStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "down", label: "Down" },
  { value: "retired", label: "Retired" },
];

export default function ToolForm({ tool, toolTypes, existingPhotos = [] }: ToolFormProps) {
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
  const [toolType, setToolType] = useState(tool?.tool_type ?? "");
  const [purchaseDate, setPurchaseDate] = useState(tool?.purchase_date ?? "");
  const [manualUrl, setManualUrl] = useState(tool?.manual_url ?? "");
  const [notes, setNotes] = useState(tool?.notes ?? "");
  const [photos, setPhotos] = useState<PhotoSelection>({
    keptPaths: tool?.photo_url ? [tool.photo_url] : [],
    newFiles: [],
  });
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
      tool_type: toolType || null,
      purchase_date: purchaseDate || null,
      manual_url: manualUrl.trim() || null,
      notes: notes.trim() || null,
    };

    if (isEditing) {
      // Upload any new photo, then resolve the single photo_url: a new upload
      // wins, else keep the existing one (or null if it was removed).
      const newPaths = await uploadPhotos(supabase, photos.newFiles, `tools/${tool.id}`);
      const photoUrl = photos.newFiles.length
        ? (newPaths[0] ?? null)
        : (photos.keptPaths[0] ?? null);

      const { error: err } = await supabase
        .from("tools")
        .update({ ...payload, photo_url: photoUrl })
        .eq("id", tool.id);
      if (err) {
        setError(err.message);
        setIsLoading(false);
        return;
      }
    } else {
      const { data: created, error: err } = await supabase
        .from("tools")
        .insert(payload)
        .select("id")
        .single();
      if (err || !created) {
        setError(
          err?.code === "23505"
            ? "A tool with that slug already exists. Try a different name or edit the slug."
            : (err?.message ?? "Failed to add tool."),
        );
        setIsLoading(false);
        return;
      }

      if (photos.newFiles.length > 0) {
        const paths = await uploadPhotos(supabase, photos.newFiles, `tools/${created.id}`);
        if (paths.length > 0) {
          await supabase.from("tools").update({ photo_url: paths[0] }).eq("id", created.id);
        }
      }
    }

    router.push(`/tools/${payload.slug}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Name */}
      <Field label="Name *">
        <Input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Grizzly 14-inch Bandsaw"
        />
      </Field>

      {/* Slug */}
      <Field label="URL slug *" hint="Used in QR codes — lowercase letters, numbers, hyphens only">
        <Input
          type="text"
          required
          pattern="[a-z0-9-]+"
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value);
            setSlugEdited(true);
          }}
          placeholder="grizzly-bandsaw"
        />
      </Field>

      {/* Manufacturer / Model */}
      <div className="flex gap-3">
        <Field label="Manufacturer" className="flex-1">
          <Input
            type="text"
            value={manufacturer}
            onChange={(e) => setManufacturer(e.target.value)}
            placeholder="Grizzly"
          />
        </Field>
        <Field label="Model" className="flex-1">
          <Input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="G0555"
          />
        </Field>
      </div>

      {/* Serial / Location */}
      <div className="flex gap-3">
        <Field label="Serial number" className="flex-1">
          <Input type="text" value={serial} onChange={(e) => setSerial(e.target.value)} />
        </Field>
        <Field label="Location" className="flex-1">
          <Input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="East wall"
          />
        </Field>
      </div>

      {/* Status */}
      <Field label="Status">
        <Select value={status} onChange={(e) => setStatus(e.target.value as ToolStatus)}>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </Field>

      {/* Type */}
      <Field label="Type">
        <Select value={toolType} onChange={(e) => setToolType(e.target.value)}>
          <option value="">— No type —</option>
          {toolTypes.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
      </Field>

      {/* Purchase date */}
      <Field label="Purchase date">
        <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
      </Field>

      {/* Manual URL */}
      <Field label="Manual URL">
        <Input
          type="url"
          value={manualUrl}
          onChange={(e) => setManualUrl(e.target.value)}
          placeholder="https://..."
        />
      </Field>

      {/* Notes */}
      <Field label="Notes">
        <Textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any additional details…"
        />
      </Field>

      <PhotoUploader max={1} existing={existingPhotos} onChange={setPhotos} label="Photo" />

      {error && <p className="rounded-field bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1" disabled={isLoading}>
          {isLoading ? "Saving…" : isEditing ? "Save Changes" : "Add Tool"}
        </Button>
      </div>
    </form>
  );
}
