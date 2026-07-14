"use client";

import { ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import CategoryPicker, { type CategoryOption } from "@/components/CategoryPicker";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { SegmentedButtons } from "@/components/ui/Segmented";
import { type ConsumableKind, KIND_OPTIONS, kindHint } from "@/lib/consumables";
import { createClient } from "@/lib/supabase/client";
import { toHref } from "@/lib/utils";

interface EditConsumableFormProps {
  consumableTypeId: string;
  categories: CategoryOption[];
  initial: {
    name: string;
    kind: ConsumableKind;
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
  const [kind, setKind] = useState<ConsumableKind>(initial.kind);
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
        kind,
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
    <div className="flex flex-col gap-4 rounded-card bg-white p-4 shadow-sm ring-1 ring-zinc-200">
      <p className="text-sm font-medium text-zinc-700">Edit Details</p>

      <Field label="Name">
        <Input type="text" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>

      <Field label="Type" hint={kindHint(kind)}>
        <SegmentedButtons options={KIND_OPTIONS} value={kind} onChange={setKind} />
      </Field>

      <Field label="Category">
        <CategoryPicker categories={categories} value={category} onChange={setCategory} />
      </Field>

      <Field label="SKU / Part number">
        <Input type="text" value={sku} onChange={(e) => setSku(e.target.value)} />
      </Field>

      <Field label="Vendor">
        <Input type="text" value={vendor} onChange={(e) => setVendor(e.target.value)} />
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
        <Input
          type="text"
          inputMode="url"
          value={vendorUrl}
          onChange={(e) => setVendorUrl(e.target.value)}
          placeholder="woodcraft.com/part — https:// optional"
        />
      </Field>

      <Field label="Notes">
        <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>

      <Button onClick={handleSave} disabled={isSaving} className="w-full">
        {isSaving ? "Saving…" : "Save Details"}
      </Button>

      {error && <p className="rounded-field bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {success && (
        <p className="rounded-field bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>
      )}
    </div>
  );
}
