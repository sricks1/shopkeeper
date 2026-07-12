"use client";

import { useState } from "react";

export default function IssuePhotos({ urls }: { urls: string[] }) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {urls.map((url) => (
          <button
            key={url}
            type="button"
            onClick={() => setSelected(url)}
            className="h-24 w-24 shrink-0 overflow-hidden rounded-field"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="Issue attachment" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {selected && (
        <button
          type="button"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelected(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={selected}
            alt="Issue attachment at full size"
            className="max-h-full max-w-full rounded-card object-contain"
          />
        </button>
      )}
    </>
  );
}
