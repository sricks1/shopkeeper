import AppShell from "@/components/AppShell";
import { canManageTools, getCurrentStaff } from "@/lib/auth";
import NewConsumableForm from "./NewConsumableForm";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function NewConsumablePage() {
  const staff = await getCurrentStaff();
  if (!canManageTools(staff?.role)) notFound();

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
        <NewConsumableForm />
      </div>
    </AppShell>
  );
}
