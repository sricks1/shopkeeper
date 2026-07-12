"use client";

import { Package, ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { SegmentedButtons } from "@/components/ui/Segmented";
import { createConsumableOrder, createLooseOrder } from "@/lib/orders";
import { createClient } from "@/lib/supabase/client";

export interface ConsumableOption {
  consumableTypeId: string;
  inventoryItemId: string;
  name: string;
  vendor: string | null;
  vendorUrl: string | null;
  sku: string | null;
  onOrder: boolean;
}

type Mode = "consumable" | "other";

export default function NewOrderForm({ consumables }: { consumables: ConsumableOption[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(consumables.length > 0 ? "consumable" : "other");
  const [consumableId, setConsumableId] = useState("");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = consumables.find((c) => c.consumableTypeId === consumableId) ?? null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();

    const result =
      mode === "consumable" && selected
        ? await createConsumableOrder(supabase, selected)
        : await createLooseOrder(supabase, { name: name.trim(), notes: notes.trim() || null });

    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.push("/inventory/orders");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <SegmentedButtons
        options={[
          { value: "consumable", label: "Consumable", icon: Package },
          { value: "other", label: "Something else", icon: ShoppingCart },
        ]}
        value={mode}
        onChange={setMode}
      />

      {mode === "consumable" ? (
        <>
          <Field label="Consumable" htmlFor="order-consumable">
            <Select
              id="order-consumable"
              required
              value={consumableId}
              onChange={(e) => setConsumableId(e.target.value)}
            >
              <option value="">— Pick a consumable —</option>
              {consumables.map((c) => (
                <option key={c.consumableTypeId} value={c.consumableTypeId}>
                  {c.name}
                  {c.onOrder ? " (already on order)" : ""}
                </option>
              ))}
            </Select>
          </Field>
          {selected?.onOrder && (
            <p className="rounded-field bg-amber-50 px-3 py-2 text-xs text-amber-700 ring-1 ring-amber-200">
              Already on order — submitting won't create a duplicate, it just keeps the existing
              order open.
            </p>
          )}
          {selected && (selected.vendor || selected.sku) && (
            <p className="px-1 text-xs text-zinc-400">
              {[selected.vendor, selected.sku && `SKU ${selected.sku}`].filter(Boolean).join(" · ")}
            </p>
          )}
        </>
      ) : (
        <>
          <Field label="What are you ordering?" htmlFor="order-name">
            <Input
              id="order-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Shop soap, festool sandpaper sampler…"
            />
          </Field>
          <Field
            label="Notes"
            htmlFor="order-notes"
            hint="Vendor, link, quantity — whatever the person ordering needs."
          >
            <Textarea
              id="order-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
        </>
      )}

      {error && (
        <p className="rounded-field bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={busy || (mode === "consumable" ? !selected : name.trim() === "")}
      >
        {busy ? "Creating…" : "Create order"}
      </Button>
    </form>
  );
}
