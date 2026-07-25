"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import PhotoUploader, { type ExistingPhoto, type PhotoSelection } from "@/components/PhotoUploader";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { uploadPhotos } from "@/lib/photos";
import { createClient } from "@/lib/supabase/client";
import type { Enums } from "@/lib/types/database.types";

type IssueSeverity = Enums<"issue_severity">;

export interface EditableIssue {
  id: string;
  title: string;
  description: string | null;
  severity: IssueSeverity;
}

interface IssueFormProps {
  toolId: string;
  toolSlug: string;
  issue?: EditableIssue;
  existingPhotos?: ExistingPhoto[];
}

const SEVERITY_OPTIONS: { value: IssueSeverity; label: string; description: string }[] = [
  { value: "minor", label: "Minor", description: "Cosmetic or low-priority" },
  { value: "needs_attention", label: "Needs Attention", description: "Should be fixed soon" },
  { value: "down", label: "Tool Down", description: "Out of service — blocks use" },
];

// Anything past "minor" is something someone has to actually go do, so the
// task defaults on. Minor issues stay a record on the tool unless asked for.
const SEVERITY_DEFAULTS_TO_TASK: Record<IssueSeverity, boolean> = {
  minor: false,
  needs_attention: true,
  down: true,
};

// A down tool blocks members from working — that's the one that jumps the queue.
const TASK_PRIORITY_FOR_SEVERITY: Record<IssueSeverity, Enums<"task_priority">> = {
  minor: "low",
  needs_attention: "normal",
  down: "high",
};

const MAX_PHOTOS = 3;

export default function IssueForm({
  toolId,
  toolSlug,
  issue,
  existingPhotos = [],
}: IssueFormProps) {
  const router = useRouter();
  const isEditing = !!issue;

  const [title, setTitle] = useState(issue?.title ?? "");
  const [description, setDescription] = useState(issue?.description ?? "");
  const [severity, setSeverity] = useState<IssueSeverity>(issue?.severity ?? "minor");
  const [photos, setPhotos] = useState<PhotoSelection>({
    keptPaths: existingPhotos.map((p) => p.path),
    newFiles: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The checkbox tracks severity until you touch it yourself, then it stays put.
  const [addToTasks, setAddToTasks] = useState(
    SEVERITY_DEFAULTS_TO_TASK[issue?.severity ?? "minor"],
  );
  const [taskChoiceTouched, setTaskChoiceTouched] = useState(false);

  function handleSeverityChange(next: IssueSeverity) {
    setSeverity(next);
    if (!taskChoiceTouched) setAddToTasks(SEVERITY_DEFAULTS_TO_TASK[next]);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const supabase = createClient();

    if (isEditing) {
      const newPaths = await uploadPhotos(supabase, photos.newFiles, `issues/${issue.id}`);
      const photoUrls = [...photos.keptPaths, ...newPaths];

      const { error: updateError } = await supabase
        .from("issues")
        .update({
          title: title.trim(),
          description: description.trim() || null,
          severity,
          photo_urls: photoUrls,
        })
        .eq("id", issue.id);

      if (updateError) {
        setError(updateError.message);
        setIsLoading(false);
        return;
      }

      router.push(`/tools/${toolSlug}/issues/${issue.id}`);
      router.refresh();
      return;
    }

    // Create: insert first to get the id, then upload photos under it.
    const { data: created, error: insertError } = await supabase
      .from("issues")
      .insert({
        tool_id: toolId,
        title: title.trim(),
        description: description.trim() || null,
        severity,
      })
      .select("id")
      .single();

    if (insertError || !created) {
      setError(insertError?.message ?? "Failed to create issue.");
      setIsLoading(false);
      return;
    }

    if (photos.newFiles.length > 0) {
      const paths = await uploadPhotos(supabase, photos.newFiles, `issues/${created.id}`);
      if (paths.length > 0) {
        await supabase.from("issues").update({ photo_urls: paths }).eq("id", created.id);
      }
    }

    // Put it on the shared board so it's someone's job, not just a record on the
    // tool. Links back to both the tool and the issue that spawned it.
    if (addToTasks) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error: taskError } = await supabase.from("staff_tasks").insert({
        name: title.trim(),
        notes: description.trim() || null,
        tool_id: toolId,
        issue_id: created.id,
        priority: TASK_PRIORITY_FOR_SEVERITY[severity],
        scope: "team",
        created_by: user?.id ?? null,
      });

      // The issue is already saved — say so plainly rather than pretending the
      // whole submit failed and tempting a double-report.
      if (taskError) {
        setError(`Issue reported, but adding it to the task list failed: ${taskError.message}`);
        setIsLoading(false);
        return;
      }
    }

    router.push(`/tools/${toolSlug}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Title */}
      <Field label="What's wrong? *" htmlFor="issue-title">
        <Input
          id="issue-title"
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Blade guard is cracked"
        />
      </Field>

      {/* Description */}
      <Field label="Details" htmlFor="issue-details">
        <Textarea
          id="issue-details"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Any additional context — when it started, what you were doing…"
        />
      </Field>

      {/* Severity */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-zinc-700">Severity *</span>
        <div className="flex flex-col gap-2">
          {SEVERITY_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex cursor-pointer items-start gap-3 rounded-card border p-3.5 transition-colors ${
                severity === opt.value ? "border-brand bg-brand/5" : "border-zinc-200 bg-white"
              }`}
            >
              <input
                type="radio"
                name="severity"
                value={opt.value}
                checked={severity === opt.value}
                onChange={() => handleSeverityChange(opt.value)}
                className="mt-0.5 accent-brand"
              />
              <div>
                <p className="text-sm font-medium text-zinc-800">{opt.label}</p>
                <p className="text-xs text-zinc-400">{opt.description}</p>
              </div>
            </label>
          ))}
        </div>
        {severity === "down" && !isEditing && (
          <p className="rounded-field bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
            This will mark the tool as out of service and alert Steven.
          </p>
        )}
      </div>

      {/* Add to the task board. Create only — editing an issue shouldn't quietly
          spawn a second task for something already on the board. */}
      {!isEditing && (
        <label className="flex cursor-pointer items-start gap-3 rounded-card border border-zinc-200 bg-white p-3.5">
          <input
            type="checkbox"
            checked={addToTasks}
            onChange={(e) => {
              setAddToTasks(e.target.checked);
              setTaskChoiceTouched(true);
            }}
            className="mt-0.5 h-4 w-4 shrink-0 rounded accent-brand"
          />
          <div>
            <p className="text-sm font-medium text-zinc-800">Add to the task list</p>
            <p className="text-xs text-zinc-400">
              Puts this on the shared board so it can be assigned and scheduled.
            </p>
          </div>
        </label>
      )}

      {/* Photos */}
      <PhotoUploader max={MAX_PHOTOS} existing={existingPhotos} onChange={setPhotos} />

      {error && <p className="rounded-field bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" variant="accent" className="flex-1" disabled={isLoading}>
          {isLoading ? "Saving…" : isEditing ? "Save Changes" : "Report Issue"}
        </Button>
      </div>
    </form>
  );
}
