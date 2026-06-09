export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * A task is overdue when its due date is in the past and it isn't done or
 * deferred. `dateNeeded` is a date-only string ("YYYY-MM-DD"); it's treated as
 * due by end of that local day.
 */
export function isOverdue(
  dateNeeded: string | null | undefined,
  status: string,
): boolean {
  if (!dateNeeded) return false;
  if (status === "done" || status === "deferred") return false;
  const due = new Date(`${dateNeeded}T23:59:59`);
  return due.getTime() < Date.now();
}

/**
 * Make a user-typed URL openable: pass through if it already has an http(s)
 * scheme, otherwise assume https. Returns null for empty input so callers can
 * hide an "Open" affordance. Lets the user enter bare domains (woodcraft.com/x).
 */
export function toHref(raw: string | null | undefined): string | null {
  const u = (raw ?? "").trim();
  if (!u) return null;
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

export function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}
