import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/types/database.types";
import NewTaskForm from "./NewTaskForm";

type TaskScope = Enums<"task_scope">;

export default async function NewTaskPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; from?: string }>;
}) {
  const { scope, from } = await searchParams;
  const defaultScope: TaskScope = scope === "personal" ? "personal" : "team";
  const fromOrganize = from === "organize";
  const backHref = fromOrganize ? "/tasks/organize" : "/tasks";
  const backLabel = fromOrganize ? "Organize" : "Tasks";

  const supabase = await createClient();
  const [{ data: staffList }, { data: tagList }] = await Promise.all([
    supabase.from("staff").select("id, display_name").eq("active", true).order("display_name"),
    supabase.from("tags").select("id, name, color").order("name", { ascending: true }),
  ]);

  return (
    <div className="px-4 pb-4 pt-6">
      <Link href={backHref} className="mb-4 flex items-center gap-1 text-sm text-zinc-500">
        <ChevronRight size={14} className="rotate-180" />
        {backLabel}
      </Link>
      <h1 className="mb-1 text-xl font-bold text-zinc-900">
        {defaultScope === "personal" ? "New Personal Task" : "New Task"}
      </h1>
      <p className="mb-6 text-sm text-zinc-500">
        {defaultScope === "personal"
          ? "Draft it privately, then submit it to the team when it's ready."
          : "Assign it to someone or leave it for anyone to pick up."}
      </p>
      <NewTaskForm
        staff={staffList ?? []}
        allTags={tagList ?? []}
        defaultScope={defaultScope}
        from={from}
      />
    </div>
  );
}
