"use client";

import { createClient } from "@/lib/supabase/client";
import type { Enums } from "@/lib/types/database.types";
import { Camera, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";

type IssueSeverity = Enums<"issue_severity">;

interface IssueFormProps {
  toolId: string;
  toolSlug: string;
}

const SEVERITY_OPTIONS: { value: IssueSeverity; label: string; description: string }[] = [
  { value: "minor", label: "Minor", description: "Cosmetic or low-priority" },
  { value: "needs_attention", label: "Needs Attention", description: "Should be fixed soon" },
  { value: "down", label: "Tool Down", description: "Out of service — blocks use" },
];

const MAX_PHOTOS = 3;

export default function IssueForm({ toolId, toolSlug }: IssueFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<IssueSeverity>("minor");
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const remaining = MAX_PHOTOS - photos.length;
    const toAdd = files.slice(0, remaining);
    setPhotos((prev) => [...prev, ...toAdd]);
    setPreviews((prev) => [...prev, ...toAdd.map((f) => URL.createObjectURL(f))]);
    e.target.value = "";
  }

  function removePhoto(index: number) {
    URL.revokeObjectURL(previews[index]);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const supabase = createClient();

    // 1. Insert issue first to get the ID
    const { data: issue, error: insertError } = await supabase
      .from("issues")
      .insert({
        tool_id: toolId,
        title: title.trim(),
        description: description.trim() || null,
        severity,
      })
      .select("id")
      .single();

    if (insertError || !issue) {
      setError(insertError?.message ?? "Failed to create issue.");
      setIsLoading(false);
      return;
    }

    // 2. Upload photos if any
    let photoUrls: string[] = [];
    if (photos.length > 0) {
      const uploads = await Promise.all(
        photos.map(async (file, i) => {
          const ext = file.name.split(".").pop() ?? "jpg";
          const path = `issues/${issue.id}/${i}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from("shopkeeper")
            .upload(path, file, { upsert: false });
          if (uploadError) return null;
          return path;
        }),
      );
      photoUrls = uploads.filter((p): p is string => p !== null);

      if (photoUrls.length > 0) {
        await supabase
          .from("issues")
          .update({ photo_urls: photoUrls })
          .eq("id", issue.id);
      }
    }

    router.push(`/tools/${toolSlug}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Title */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-zinc-700">What's wrong? *</label>
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputCls}
          placeholder="Blade guard is cracked"
        />
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-zinc-700">Details</label>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={inputCls}
          placeholder="Any additional context — when it started, what you were doing…"
        />
      </div>

      {/* Severity */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-zinc-700">Severity *</label>
        <div className="flex flex-col gap-2">
          {SEVERITY_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors ${
                severity === opt.value
                  ? "border-[#324168] bg-[#324168]/5"
                  : "border-zinc-200 bg-white"
              }`}
            >
              <input
                type="radio"
                name="severity"
                value={opt.value}
                checked={severity === opt.value}
                onChange={() => setSeverity(opt.value)}
                className="mt-0.5 accent-[#324168]"
              />
              <div>
                <p className="text-sm font-medium text-zinc-800">{opt.label}</p>
                <p className="text-xs text-zinc-400">{opt.description}</p>
              </div>
            </label>
          ))}
        </div>
        {severity === "down" && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
            This will mark the tool as out of service and alert Steven.
          </p>
        )}
      </div>

      {/* Photos */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-zinc-700">
          Photos <span className="text-zinc-400 font-normal">({photos.length}/{MAX_PHOTOS})</span>
        </label>

        {previews.length > 0 && (
          <div className="flex gap-2">
            {previews.map((src, i) => (
              <div key={src} className="relative h-20 w-20 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`Photo ${i + 1}`}
                  className="h-full w-full rounded-lg object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {photos.length < MAX_PHOTOS && (
          <>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-500"
            >
              <Camera size={16} />
              Add photo
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={handlePhotoSelect}
            />
          </>
        )}
      </div>

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
          className="flex-1 rounded-lg bg-[#e06829] py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {isLoading ? "Submitting…" : "Report Issue"}
        </button>
      </div>
    </form>
  );
}

const inputCls =
  "w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-[#324168] focus:ring-2 focus:ring-[#324168]/20";
