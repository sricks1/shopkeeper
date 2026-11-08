import { AlertTriangle, ChevronRight } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import NewConsumableForm, { type ConsumablePrefill } from "./NewConsumableForm";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// Prefill comes from the "Add to ShopKeeper" Chrome extension (see /extension),
// which opens this page with ?name=…&sku=…&vendor=…&vendor_url=…&notes=….
// Nothing is saved until a person reviews the form and submits it.
const PREFILL_KEYS = ["name", "sku", "vendor", "vendor_url", "notes"] as const;
const MAX_PREFILL_LENGTH = 2000;

function readPrefill(params: Awaited<SearchParams>): ConsumablePrefill {
  const prefill: ConsumablePrefill = {};
  for (const key of PREFILL_KEYS) {
    const raw = params[key];
    const value = (Array.isArray(raw) ? raw[0] : raw)?.trim();
    if (value) prefill[key] = value.slice(0, MAX_PREFILL_LENGTH);
  }
  return prefill;
}

export default async function NewConsumablePage({ searchParams }: { searchParams: SearchParams }) {
  const prefill = readPrefill(await searchParams);
  const supabase = await createClient();
  const [{ data: categories }, { data: tools }, matches] = await Promise.all([
    supabase.from("consumable_categories").select("value, label").order("label"),
    supabase.from("tools").select("id, name").order("name"),
    findPossibleDuplicates(supabase, prefill),
  ]);

  return (
    <div className="px-4 pb-4 pt-4">
      <Link href="/inventory" className="mb-4 flex items-center gap-1 text-sm text-zinc-500">
        <ChevronRight size={14} className="rotate-180" />
        Inventory
      </Link>
      <h1 className="mb-1 text-lg font-semibold text-zinc-900">Add Consumable</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Creates a new part type and adds it to inventory.
      </p>
      {matches.length > 0 && (
        <div className="mb-6 rounded-field bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <p className="mb-1 flex items-center gap-1.5 font-medium">
            <AlertTriangle size={14} />
            Already in inventory?
          </p>
          <ul className="list-disc pl-5">
            {matches.map((m) => (
              <li key={m.id}>
                {m.inventoryId ? (
                  <Link href={`/inventory/${m.inventoryId}`} className="underline">
                    {m.name}
                  </Link>
                ) : (
                  m.name
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      <NewConsumableForm categories={categories ?? []} tools={tools ?? []} prefill={prefill} />
    </div>
  );
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Same SKU or same vendor link is a strong hint the part already exists —
// cheap insurance against the duplicate-consumable problem (PRD §11.2).
// Stored links are whatever was pasted (often with ?ref_=… tracking), so URLs
// match by prefix without the query string, and Amazon links by ASIN.
// Mirrored by `InventoryService.findPossibleDuplicates` in the iOS app —
// change one, change the other.
async function findPossibleDuplicates(supabase: Supabase, prefill: ConsumablePrefill) {
  const filters: string[] = [];
  // PostgREST .or() syntax: quote values so commas/parens in URLs don't break
  // it; `*` is the ilike wildcard.
  const quote = (v: string) => `"${v.replace(/["\\]/g, "\\$&")}"`;
  if (prefill.sku) filters.push(`sku.ilike.${quote(prefill.sku)}`);
  if (prefill.vendor_url) {
    const base = prefill.vendor_url.split(/[?#]/)[0].replace(/\/+$/, "");
    if (base) filters.push(`vendor_url.ilike.${quote(`${base}*`)}`);
    const asin = prefill.vendor_url.match(/\/dp\/([A-Z0-9]{10})/i)?.[1];
    if (asin) filters.push(`vendor_url.ilike.${quote(`*${asin}*`)}`);
  }
  if (filters.length === 0) return [];

  const { data } = await supabase
    .from("consumable_types")
    .select("id, name, inventory_items(id)")
    .or(filters.join(","))
    .limit(5);

  return (data ?? []).map((row) => {
    const inv = row.inventory_items as { id: string } | { id: string }[] | null;
    const inventoryId = Array.isArray(inv) ? inv[0]?.id : inv?.id;
    return { id: row.id, name: row.name, inventoryId };
  });
}
