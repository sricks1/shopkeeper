import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

type Client = SupabaseClient<Database>;

export const PHOTO_BUCKET = "shopkeeper";

// Upload a set of picked files under `prefix` (e.g. "tools/<id>"), returning the
// storage paths that succeeded. Mirrors the issue-photo upload flow.
export async function uploadPhotos(
  supabase: Client,
  files: File[],
  prefix: string,
): Promise<string[]> {
  if (files.length === 0) return [];
  const uploaded = await Promise.all(
    files.map(async (file, i) => {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${prefix}/${Date.now()}-${i}.${ext}`;
      const { error } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(path, file, { upsert: false });
      return error ? null : path;
    }),
  );
  return uploaded.filter((p): p is string => p !== null);
}

// Turn stored bucket paths into short-lived signed URLs for display. Order is
// preserved so callers can pair paths with URLs.
export async function signedPhotoUrls(supabase: Client, paths: string[]): Promise<string[]> {
  if (!paths || paths.length === 0) return [];
  const { data } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(paths, 3600);
  return (data ?? []).map((s) => s.signedUrl).filter((u): u is string => u !== null);
}

// Same as above but keeps the path↔url pairing (for editable galleries where a
// removal needs the original path).
export async function signedPhotos(
  supabase: Client,
  paths: string[],
): Promise<{ path: string; url: string }[]> {
  if (!paths || paths.length === 0) return [];
  const { data } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(paths, 3600);
  return (data ?? [])
    .map((s) => (s.signedUrl ? { path: s.path ?? "", url: s.signedUrl } : null))
    .filter((p): p is { path: string; url: string } => p !== null);
}
