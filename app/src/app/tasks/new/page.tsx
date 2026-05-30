import AppShell from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import NewTaskForm from "./NewTaskForm";

export default async function NewTaskPage() {
  const supabase = await createClient();
  const { data: staffList } = await supabase
    .from("staff")
    .select("id, display_name")
    .eq("active", true)
    .order("display_name");

  return (
    <AppShell>
      <div className="px-4 pb-4 pt-6">
        <Link href="/tasks" className="mb-4 flex items-center gap-1 text-sm text-zinc-500">
          <ChevronRight size={14} className="rotate-180" />
          Tasks
        </Link>
        <h1 className="mb-1 text-xl font-bold text-zinc-900">New Task</h1>
        <p className="mb-6 text-sm text-zinc-500">
          Assign it to someone or leave it for anyone to pick up.
        </p>
        <NewTaskForm staff={staffList ?? []} />
      </div>
    </AppShell>
  );
}
