// Where ShopKeeper lives. Point it at a local dev server (e.g.
// http://localhost:3000) from the extension's Options page when testing.
export const DEFAULT_BASE_URL = "https://shopkeeper.thejoinery.club";

const KEY = "baseUrl";

export async function getBaseUrl(): Promise<string> {
  const stored = await chrome.storage.sync.get(KEY);
  const value = stored[KEY];
  return typeof value === "string" && value ? value : DEFAULT_BASE_URL;
}

export async function setBaseUrl(url: string): Promise<void> {
  await chrome.storage.sync.set({ [KEY]: normalizeBaseUrl(url) });
}

/** Accepts "shopkeeper.thejoinery.club" or "https://…/" and returns "https://…". */
export function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) return DEFAULT_BASE_URL;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}
