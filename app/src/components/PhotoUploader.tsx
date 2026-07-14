"use client";

import { Camera, X } from "lucide-react";
import { useRef, useState } from "react";

export interface ExistingPhoto {
  path: string;
  url: string;
}

export interface PhotoSelection {
  /** Paths of already-saved photos the user chose to keep. */
  keptPaths: string[];
  /** Newly picked files to upload on save. */
  newFiles: File[];
}

interface PhotoUploaderProps {
  max: number;
  existing?: ExistingPhoto[];
  onChange: (selection: PhotoSelection) => void;
  /** Label above the thumbnails. */
  label?: string;
}

// Reusable photo picker: shows already-saved photos (removable) plus newly
// picked ones (previewed), capped at `max`. Uploading is left to the parent —
// it needs the saved entity id for the storage path — so this only reports the
// current selection via onChange.
export default function PhotoUploader({
  max,
  existing = [],
  onChange,
  label = "Photos",
}: PhotoUploaderProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [kept, setKept] = useState<ExistingPhoto[]>(existing);
  const [picked, setPicked] = useState<{ file: File; preview: string }[]>([]);

  const total = kept.length + picked.length;

  function emit(nextKept: ExistingPhoto[], nextPicked: { file: File; preview: string }[]) {
    onChange({
      keptPaths: nextKept.map((k) => k.path),
      newFiles: nextPicked.map((p) => p.file),
    });
  }

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const room = max - total;
    const toAdd = files
      .slice(0, room)
      .map((file) => ({ file, preview: URL.createObjectURL(file) }));
    const next = [...picked, ...toAdd];
    setPicked(next);
    emit(kept, next);
    e.target.value = "";
  }

  function removeExisting(path: string) {
    const next = kept.filter((k) => k.path !== path);
    setKept(next);
    emit(next, picked);
  }

  function removePicked(index: number) {
    URL.revokeObjectURL(picked[index].preview);
    const next = picked.filter((_, i) => i !== index);
    setPicked(next);
    emit(kept, next);
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-zinc-700">
        {label}{" "}
        <span className="font-normal text-zinc-400">
          ({total}/{max})
        </span>
      </span>

      {total > 0 && (
        <div className="flex flex-wrap gap-2">
          {kept.map((photo) => (
            <div key={photo.path} className="relative h-20 w-20 shrink-0">
              {/* biome-ignore lint/performance/noImgElement: signed URLs, small in-app thumbnails */}
              <img
                src={photo.url}
                alt="Attachment"
                className="h-full w-full rounded-field object-cover"
              />
              <button
                type="button"
                onClick={() => removeExisting(photo.path)}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white"
                aria-label="Remove photo"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          {picked.map((item, i) => (
            <div key={item.preview} className="relative h-20 w-20 shrink-0">
              {/* biome-ignore lint/performance/noImgElement: local object-URL preview */}
              <img
                src={item.preview}
                alt="New attachment preview"
                className="h-full w-full rounded-field object-cover"
              />
              <button
                type="button"
                onClick={() => removePicked(i)}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white"
                aria-label="Remove photo"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {total < max && (
        <>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 self-start rounded-field border border-dashed border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-500 transition-colors active:bg-zinc-50"
          >
            <Camera size={16} />
            Add photo
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple={max > 1}
            className="hidden"
            onChange={handleSelect}
          />
        </>
      )}
    </div>
  );
}
