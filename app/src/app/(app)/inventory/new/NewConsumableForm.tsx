"use client";

import { ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import CategoryPicker, { type CategoryOption } from "@/components/CategoryPicker";
import PhotoUploader, { type PhotoSelection } from "@/components/PhotoUploader";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { SegmentedButtons } from "@/components/ui/Segmented";
import { KIND_OPTIONS, kindHint } from "@/lib/consumables";
import { uploadPhotos } from "@/lib/photos";
import { createClient } from "@/lib/supabase/client";
import type { Enums } from "@/lib/types/database.types";
import { toHref } from "@/lib/utils";

const MAX_PHOTOS = 5;

export default function NewConsumableForm({ categories }: { categories: CategoryOption[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<Enums<"consumable_kind">>("consumable");
  const [category, setCategory] = useState<string>(categories[0]?.value ?? "other");
  const [sku, setSku] = useState("");
  const [vendor, setVendor] = useState("");
  const [vendorUrl, setVendorUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<PhotoSelection>({ keptPaths: [], newFiles: [] });
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
        kind,
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

    // 3. Upload any photos, then record their paths on the consumable type.
    if (photos.newFiles.length > 0) {
      const paths = await uploadPhotos(supabase, photos.newFiles, `consumables/${ct.id}`);
      if (paths.length > 0) {
        await supabase.from("consumable_types").update({ photo_urls: paths }).eq("id", ct.id);
      }
    }

    router.push(`/inventory/${inv.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Name *">
        <Input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="1/2-inch bandsaw blade, 3 TPI"
        />
      </Field>

      <Field label="Type" hint={kindHint(kind)}>
        <SegmentedButtons options={KIND_OPTIONS} value={kind} onChange={setKind} />
      </Field>

      <Field label="Category *">
        <CategoryPicker categories={categories} value={category} onChange={setCategory} />
      </Field>

      <Field label="SKU / Part number">
        <Input
          type="text"
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          placeholder="WC-B-123"
        />
      </Field>

      <Field label="Vendor">
        <Input
          type="text"
          value={vendor}
          onChange={(e) => setVendor(e.target.value)}
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
        <Input
          type="text"
          inputMode="url"
          value={vendorUrl}
          onChange={(e) => setVendorUrl(e.target.value)}
          placeholder="woodcraft.com/part — https:// optional"
        />
      </Field>

      <Field label="Notes">
        <Textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="OEM spec, don't substitute…"
        />
      </Field>

      <PhotoUploader max={MAX_PHOTOS} onChange={setPhotos} />

      {error && <p className="rounded-field bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? "Adding…" : "Add Consumable"}
        </Button>
      </div>
    </form>
  );
}
