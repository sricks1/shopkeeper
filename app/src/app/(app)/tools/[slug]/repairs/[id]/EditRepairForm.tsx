"use client";

import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import KindChip from "@/components/inventory/KindChip";
import PhotoUploader, { type ExistingPhoto, type PhotoSelection } from "@/components/PhotoUploader";
import type { ConsumableOption, OpenIssue } from "@/components/repairs/RepairForm";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { uploadPhotos } from "@/lib/photos";
import { createClient } from "@/lib/supabase/client";

const MAX_PHOTOS = 5;

interface EditRepairFormProps {
  repairId: string;
  toolSlug: string;
  initial: {
    description: string;
    laborMinutes: string;
    notes: string;
    createdAt: string;
    issueId: string;
  };
  /** Consumables/parts recorded on this repair (read-only in this view). */
  usedConsumables: ConsumableOption[];
  /** Photos already attached to this repair. */
  existingPhotos: ExistingPhoto[];
  /** Open issues for the tool, plus the currently-linked one if resolved. */
  openIssues: OpenIssue[];
}

export default function EditRepairForm({
  repairId,
  toolSlug,
  initial,
  usedConsumables,
  existingPhotos,
  openIssues,
}: EditRepairFormProps) {
  const router = useRouter();

  const initialDate = format(new Date(initial.createdAt), "yyyy-MM-dd");
  const [description, setDescription] = useState(initial.description);
  const [laborMinutes, setLaborMinutes] = useState(initial.laborMinutes);
  const [notes, setNotes] = useState(initial.notes);
  const [date, setDate] = useState(initialDate);
  const [issueId, setIssueId] = useState(initial.issueId);
  const [photos, setPhotos] = useState<PhotoSelection>({
    keptPaths: existingPhotos.map((p) => p.path),
    newFiles: [],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSaving(true);

    const supabase = createClient();

    // Upload newly picked photos, then persist kept + new paths together.
    const newPaths = await uploadPhotos(supabase, photos.newFiles, `repairs/${repairId}`);
    const photoUrls = [...photos.keptPaths, ...newPaths];

    const update: {
      description: string;
      labor_minutes: number | null;
      notes: string | null;
      issue_id: string | null;
      photo_urls: string[];
      created_at?: string;
    } = {
      description: description.trim(),
      labor_minutes: laborMinutes ? parseInt(laborMinutes, 10) : null,
      notes: notes.trim() || null,
      issue_id: issueId || null,
      photo_urls: photoUrls,
    };

    // Only touch the timestamp if the date actually changed; keep it at noon so
    // it can't drift across a day boundary in the local timezone.
    if (date && date !== initialDate) {
      update.created_at = new Date(`${date}T12:00:00`).toISOString();
    }

    const { error: updateErr } = await supabase.from("repairs").update(update).eq("id", repairId);

    if (updateErr) {
      setError(updateErr.message);
      setIsSaving(false);
      return;
    }

    // Newly linking an open issue resolves it, matching the log-repair flow.
    if (issueId && issueId !== initial.issueId) {
      await supabase
        .from("issues")
        .update({ status: "resolved", resolved_at: new Date().toISOString() })
        .eq("id", issueId)
        .eq("status", "open");
    }

    router.push(`/tools/${toolSlug}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="What was done? *" htmlFor="repair-description">
        <Textarea
          id="repair-description"
          required
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>

      <Field label="Date" htmlFor="repair-date">
        <Input
          id="repair-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </Field>

      {/* Linked issue */}
      {(openIssues.length > 0 || issueId) && (
        <Field
          label="Resolves issue"
          htmlFor="repair-issue"
          hint={
            issueId && issueId !== initial.issueId
              ? "Issue will be marked resolved on save."
              : undefined
          }
        >
          <Select id="repair-issue" value={issueId} onChange={(e) => setIssueId(e.target.value)}>
            <option value="">— None / preventive maintenance —</option>
            {openIssues.map((issue) => (
              <option key={issue.id} value={issue.id}>
                {issue.title}
              </option>
            ))}
          </Select>
        </Field>
      )}

      {/* Consumables used — read-only here (removal is owner/shop_master-gated
          at the DB, so editing them lives in its own flow). */}
      {usedConsumables.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-zinc-700">Consumables &amp; parts used</span>
          <ul className="flex flex-col gap-2">
            {usedConsumables.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-card border border-zinc-200 bg-white px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-800">{c.name}</p>
                  <p className="truncate text-xs capitalize text-zinc-400">
                    {c.category.replace(/_/g, " ")}
                  </p>
                </div>
                {c.kind === "part" && <KindChip kind="part" />}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Field label="Labor (minutes)" htmlFor="repair-labor">
        <Input
          id="repair-labor"
          type="number"
          min="0"
          value={laborMinutes}
          onChange={(e) => setLaborMinutes(e.target.value)}
        />
      </Field>

      <Field label="Notes" htmlFor="repair-notes">
        <Textarea
          id="repair-notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>

      <PhotoUploader max={MAX_PHOTOS} existing={existingPhotos} onChange={setPhotos} />

      {error && <p className="rounded-field bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1" disabled={isSaving}>
          {isSaving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
