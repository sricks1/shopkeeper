"use client";

import { ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import CategoryPicker, { type CategoryOption } from "@/components/CategoryPicker";
import { createClient } from "@/lib/supabase/client";
import { toHref } from "@/lib/utils";

export default function NewConsumableForm({ categories }: { categories: CategoryOption[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(categories[0]?.value ?? "other");
  const [sku, setSku] = useState("");
  const [vendor, setVendor] = useState("");
  const [vendorUrl, setVendorUrl] = useState("");
  const [notes, setNotes] = useState("");
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

    // 2. Create the inventory record (starts In Stock)
    const { data: inv, error: invErr } = await supabase
      .from("inventory_items")
      .insert({ consumable_type_id: ct.id })
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
        <CategoryPicker categories={categories} value={category} onChange={setCategory} />
      </Field>

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

      <Field
        label="Vendor URL"
        action={
          toHref(vendorUrl) && (
            <a
              href={toHref(vendorUrl) as string}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
            >
              <ExternalLink size={13} />
              Open
            </a>
          )
        }
      >
        <input
          type="text"
          inputMode="url"
          value={vendorUrl}
          onChange={(e) => setVendorUrl(e.target.value)}
          className={inputCls}
          placeholder="woodcraft.com/part — https:// optional"
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

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

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
          className="flex-1 rounded-lg bg-brand py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {isLoading ? "Adding…" : "Add Consumable"}
        </button>
      </div>
    </form>
  );
}

const inputCls =
  "w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

function Field({
  label,
  hint,
  action,
  children,
  className,
}: {
  label: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-zinc-700">{label}</span>
        {action}
      </div>
      {children}
      {hint && <p className="text-xs text-zinc-400">{hint}</p>}
    </div>
  );
}
