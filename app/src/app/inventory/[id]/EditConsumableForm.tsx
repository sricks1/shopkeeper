"use client";

import CategoryPicker, { type CategoryOption } from "@/components/CategoryPicker";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface EditConsumableFormProps {
  consumableTypeId: string;
  categories: CategoryOption[];
  initial: {
    name: string;
    category: string;
    sku: string | null;
    vendor: string | null;
    vendor_url: string | null;
    notes: string | null;
  };
}

export default function EditConsumableForm({
  consumableTypeId,
  categories,
  initial,
}: EditConsumableFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [category, setCategory] = useState(initial.category);
  const [sku, setSku] = useState(initial.sku ?? "");
  const [vendor, setVendor] = useState(initial.vendor ?? "");
  const [vendorUrl, setVendorUrl] = useState(initial.vendor_url ?? "");
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    const supabase = createClient();
    const { error: err } = await supabase
      .from("consumable_types")
      .update({
        name: name.trim(),
        category,
        sku: sku.trim() || null,
        vendor: vendor.trim() || null,
        vendor_url: vendorUrl.trim() || null,
        notes: notes.trim() || null,
      })
      .eq("id", consumableTypeId);
    setIsSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSuccess("Saved.");
    router.refresh();
    setTimeout(() => setSuccess(null), 2000);
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl bg-white px-4 py-4 shadow-sm ring-1 ring-zinc-200">
      <p className="text-sm font-medium text-zinc-700">Edit Details</p>

      <Field label="Name">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputCls}
        />
      </Field>

      <Field label="Category">
        <CategoryPicker categories={categories} value={category} onChange={setCategory} />
      </Field>

      <Field label="SKU / Part number">
        <input
          type="text"
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          className={inputCls}
        />
      </Field>

      <Field label="Vendor">
        <input
          type="text"
          value={vendor}
          onChange={(e) => setVendor(e.target.value)}
          className={inputCls}
        />
      </Field>

      <Field label="Vendor URL">
        <input
          type="url"
          value={vendorUrl}
          onChange={(e) => setVendorUrl(e.target.value)}
          className={inputCls}
        />
      </Field>

      <Field label="Notes">
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={inputCls}
        />
      </Field>

      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving}
        className="w-full rounded-lg bg-[#324168] py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isSaving ? "Saving…" : "Save Details"}
      </button>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {success && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>
      )}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-[#324168] focus:ring-2 focus:ring-[#324168]/20";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-zinc-700">{label}</label>
      {children}
    </div>
  );
}
