import type { DragEvent } from "react";

// What's being dragged around the organizer.
export type DragPayload =
  | { kind: "task"; taskId: string } // an unfiled task from the pool
  | { kind: "item"; itemId: string; taskId: string } // a task already filed in a folder
  | { kind: "folder"; folderId: string };

const MIME = "application/x-organizer";

// The payload isn't readable during dragover (see getDrag), but drop targets
// still need to know *what kind* of thing is being dragged to give the right
// hover feedback. Mirror it here at dragstart so dragover handlers can read it.
let active: DragPayload | null = null;

export function setDrag(e: DragEvent, payload: DragPayload): void {
  e.dataTransfer.setData(MIME, JSON.stringify(payload));
  e.dataTransfer.effectAllowed = "move";
  active = payload;
}

export function getActiveDrag(): DragPayload | null {
  return active;
}

export function clearActiveDrag(): void {
  active = null;
}

// Note: the payload is only readable on drop, not during dragover (browser
// security), so drop targets call preventDefault on dragover unconditionally
// and validate the parsed payload here in the drop handler.
export function getDrag(e: DragEvent): DragPayload | null {
  const raw = e.dataTransfer.getData(MIME);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DragPayload;
  } catch {
    return null;
  }
}
