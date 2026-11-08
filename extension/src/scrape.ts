export type ScrapedProduct = {
  name?: string;
  sku?: string;
  vendor?: string;
  vendor_url?: string;
  notes?: string;
};

/**
 * Runs inside the product page via chrome.scripting.executeScript, which
 * serializes the function's source. It must be fully self-contained: no
 * imports, no references to anything outside its own body.
 *
 * Strategy: Amazon gets dedicated selectors (it's the common case and its
 * markup is stable-ish); everything else falls back to schema.org Product
 * JSON-LD, then Open Graph tags, then the page title. Highlighted text, if
 * any, wins as the name — handy when a page title is pure SEO soup.
 */
export function scrapeProduct(): ScrapedProduct {
  const clean = (s: string | null | undefined): string | undefined => {
    const v = (s ?? "").replace(/\s+/g, " ").trim();
    return v || undefined;
  };
  const meta = (selector: string) =>
    clean(document.querySelector<HTMLMetaElement>(selector)?.content);
  const text = (selector: string) => clean(document.querySelector(selector)?.textContent);

  const selection = clean(window.getSelection()?.toString());
  const host = location.hostname.replace(/^www\./, "");

  // ─── Amazon ────────────────────────────────────────────────────────────────
  if (/(^|\.)amazon\.[a-z.]+$/.test(host)) {
    const asin =
      clean(document.querySelector<HTMLInputElement>("#ASIN")?.value) ??
      location.pathname.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})/)?.[1];

    const brand = text("#bylineInfo")
      ?.replace(/^Visit the\s+/i, "")
      .replace(/\s+Store$/i, "")
      .replace(/^Brand:\s*/i, "");

    // "Item model number" / "Part Number" live in one of two detail tables.
    let model: string | undefined;
    for (const row of document.querySelectorAll(
      "#productDetails_techSpec_section_1 tr, #productDetails_detailBullets_sections1 tr, #detailBullets_feature_div li",
    )) {
      const label = clean(row.querySelector("th, .a-text-bold")?.textContent)?.replace(/[:‎‏]/g, "");
      if (label && /^(item model number|part number|manufacturer part number)/i.test(label)) {
        const valueEl = row.querySelector("td") ?? row.querySelector(".a-text-bold + span");
        model = clean(valueEl?.textContent)?.replace(/[‎‏]/g, "");
        if (model) break;
      }
    }

    // Shop convention: SKU holds the manufacturer part number (e.g. "D1050X"),
    // which the link can't recover. ASIN is the fallback; it's in the URL anyway.
    const notes = [brand && `Brand: ${brand}`, model && asin && `ASIN: ${asin}`]
      .filter(Boolean)
      .join(" · ");

    return {
      name: selection ?? text("#productTitle") ?? clean(document.title),
      sku: model ?? asin,
      vendor: "Amazon",
      // Canonical short link — drops the ref=/tracking junk in the address bar.
      vendor_url: asin ? `https://${location.hostname}/dp/${asin}` : location.href,
      notes: notes || undefined,
    };
  }

  // ─── Everything else ───────────────────────────────────────────────────────
  type Json = Record<string, unknown>;
  const findProduct = (node: unknown): Json | undefined => {
    if (Array.isArray(node)) {
      for (const n of node) {
        const hit = findProduct(n);
        if (hit) return hit;
      }
      return undefined;
    }
    if (!node || typeof node !== "object") return undefined;
    const obj = node as Json;
    const type = obj["@type"];
    if (type === "Product" || (Array.isArray(type) && type.includes("Product"))) return obj;
    return findProduct(obj["@graph"]);
  };

  let product: Json | undefined;
  for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      product = findProduct(JSON.parse(script.textContent ?? ""));
    } catch {
      // Malformed JSON-LD is common; skip it.
    }
    if (product) break;
  }

  const str = (v: unknown) => (typeof v === "string" ? clean(v) : undefined);
  const brandField = product?.brand;
  const brand =
    str(brandField) ??
    str((brandField as Json | undefined)?.name) ??
    meta('meta[property="product:brand"]');
  const mpn = str(product?.mpn);
  const sku = str(product?.sku) ?? mpn;

  const notes = [brand && `Brand: ${brand}`, mpn && mpn !== sku && `MPN: ${mpn}`]
    .filter(Boolean)
    .join(" · ");

  const canonical = clean(document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href);

  // Some sites (Rockler) put a URL in og:site_name; the bare host reads better.
  const siteName = meta('meta[property="og:site_name"]');
  const vendor = siteName && !/^https?:\/\/|\.(com|net|org)\/?$/i.test(siteName) ? siteName : host;

  return {
    name:
      selection ?? str(product?.name) ?? meta('meta[property="og:title"]') ?? clean(document.title),
    sku,
    vendor,
    vendor_url: canonical ?? meta('meta[property="og:url"]') ?? location.href,
    notes: notes || undefined,
  };
}
