import { Plus, Wrench } from "lucide-react";
import Link from "next/link";
import ToolsList, { type ToolSection } from "@/components/tools/ToolsList";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { canManageTools, getCurrentStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function ToolsPage() {
  const supabase = await createClient();
  const staff = await getCurrentStaff();

  const { data: toolTypes } = await supabase
    .from("tool_types")
    .select("value, label")
    .order("sort_order");

  const { data: tools } = await supabase
    .from("tools")
    .select("id, name, slug, status, location, manufacturer, model, tool_type")
    .order("name");

  const downCount = tools?.filter((t) => t.status === "down").length ?? 0;

  // Group tools under their type, in tool_types sort order. Tools with no type
  // (or a type we don't recognize) land in a final "Ungrouped" section.
  const knownTypes = new Set(toolTypes?.map((t) => t.value));
  const sections: ToolSection[] = (toolTypes ?? [])
    .map((type) => ({
      key: type.value,
      label: type.label,
      tools: tools?.filter((t) => t.tool_type === type.value) ?? [],
    }))
    .filter((section) => section.tools.length > 0);

  const ungrouped = tools?.filter((t) => !t.tool_type || !knownTypes.has(t.tool_type)) ?? [];
  if (ungrouped.length > 0) {
    sections.push({ key: "ungrouped", label: "Ungrouped", tools: ungrouped });
  }

  return (
    <div className="px-4 pb-4 pt-4">
      <PageHeader
        title="Shop Tools"
        subtitle={
          <>
            {tools?.length ?? 0} tools
            {downCount > 0 && (
              <span className="ml-2 font-medium text-red-600">· {downCount} down</span>
            )}
          </>
        }
        action={
          canManageTools(staff?.role) && (
            <Link href="/tools/new" className={buttonClasses()}>
              <Plus size={16} />
              Add Tool
            </Link>
          )
        }
      />

      {/* Tool list */}
      {!tools?.length ? (
        <EmptyState
          icon={Wrench}
          title="No tools yet"
          action={
            canManageTools(staff?.role)
              ? { label: "Add the first one", href: "/tools/new" }
              : undefined
          }
        />
      ) : (
        <ToolsList sections={sections} />
      )}
    </div>
  );
}
