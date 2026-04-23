"use client";

import { createClient } from "@/lib/supabase/client";
import type { Enums } from "@/lib/types/database.types";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

type ConsumableCategory = Enums<"consumable_category">;

const CATEGORIES: { value: ConsumableCategory; label: string }[] = [
  { value: "blade", label: "Blade" },
  { value: "bearing", label: "Bearing" },
  { value: "belt", label: "Belt" },
  { value: "throat_plate", label: "Throat Plate" },
  { value: "filter", label: "Filter" },
  { value: "brush", label: "Brush" },
  { value: "other", label: "Other" },
];

export default function NewConsumableForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ConsumableCategory>("blade");
  const [sku, setSku] = useState("");
  const [vendor, setVendor] = useState("");
  const [vendorUrl, setVendorUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [onHand, setOnHand] = useState("0");
  const [threshold, setThreshold] = useState("1");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    const supabase = createClient();

    // 1. Create consumable type
    const { data: ct, error: ctErr } = await supabase
      .from("consumable_types")
      .insert({
        name: name.trim(),
        category,
        sku: sku.trim() || null,
        vendor: vendor.trim() || null,
        vendor_url: vendorUrl.trim() || null,
        notes: notes.trim() || null,
      })
      .select("id")
      .single();

    if (ctErr || !ct) {
      setError(ctErr?.message ?? "Failed to create consumable.");
      setIsLoading(false);
      return;
    }

    // 2. Create inventory item
    const { data: inv, error: invErr } = await supabase
      .from("inventory_items")
      .insert({
        consumable_type_id: ct.id,
        quantity_on_hand: parseInt(onHand, 10),
        reorder_threshold: parseInt(threshold, 10),
      })
      .select("id")
      .single();

    if (invErr || !inv) {
      setError(invErr?.message ?? "Failed to create inventory record.");
      setIsLoading(false);
      return;
    }

    router.push(`/inventory/${inv.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Field label="Name *">
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputCls}
          placeholder="1/2-inch bandsaw blade, 3 TPI"
        />
      </Field>

      <Field label="Category *">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as ConsumableCategory)}
          className={inputCls}
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </Field>

      <div className="flex gap-3">
        <Field label="On hand" className="flex-1">
          <input
            type="number"
            min="0"
            required
            value={onHand}
            onChange={(e) => setOnHand(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Reorder at" className="flex-1" hint="Alert fires at or below this">
          <input
            type="number"
            min="0"
            required
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            className={inputCls}
          />
        </Field>
      </div>

      <Field label="SKU / Part number">
        <input
          type="text"
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          className={inputCls}
          placeholder="WC-B-123"
        />
      </Field>

      <Field label="Vendor">
        <input
          type="text"
          value={vendor}
          onChange={(e) => setVendor(e.target.value)}
          className={inputCls}
          placeholder="Woodcraft"
        />
      </Field>

      <Field label="Vendor URL">
        <input
          type="url"
          value={vendorUrl}
          onChange={(e) => setVendorUrl(e.target.value)}
          className={inputCls}
          placeholder="https://woodcraft.com/..."
        />
      </Field>

      <Field label="Notes">
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={inputCls}
          placeholder="OEM spec, don't substitute…"
        />
      </Field>

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
          className="flex-1 rounded-lg bg-[#324168] py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {isLoading ? "Adding…" : "Add Consumable"}
        </button>
      </div>
    </form>
  );
}

const inputCls =
  "w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-[#324168] focus:ring-2 focus:ring-[#324168]/20";

function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <label className="text-sm font-medium text-zinc-700">{label}</label>
      {children}
      {hint && <p className="text-xs text-zinc-400">{hint}</p>}
    </div>
  );
}
