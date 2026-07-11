import { ChevronRight } from "lucide-react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import NewConsumableForm from "./NewConsumableForm";

export default async function NewConsumablePage() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("consumable_categories")
    .select("value, label")
    .order("label");

  return (
    <AppShell>
      <div className="px-4 pb-4 pt-6">
        <Link href="/inventory" className="mb-4 flex items-center gap-1 text-sm text-zinc-500">
          <ChevronRight size={14} className="rotate-180" />
          Inventory
        </Link>
        <h1 className="mb-1 text-xl font-bold text-zinc-900">Add Consumable</h1>
        <p className="mb-6 text-sm text-zinc-500">
          Creates a new part type and adds it to inventory.
        </p>
        <NewConsumableForm categories={categories ?? []} />
      </div>
    </AppShell>
  );
}
