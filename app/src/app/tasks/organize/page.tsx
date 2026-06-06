import AppShell from "@/components/AppShell";
import TaskOrganizer from "@/components/organizer/TaskOrganizer";
import { getCurrentStaff } from "@/lib/auth";
import { loadOrganizerState } from "@/lib/organizer/load";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function OrganizePage() {
  const staff = await getCurrentStaff();
  if (!staff) redirect("/login");

  const supabase = await createClient();
  const [{ data: staffList }, initialState] = await Promise.all([
    supabase.from("staff").select("id, display_name").eq("active", true).order("display_name"),
    loadOrganizerState(supabase, staff.id),
  ]);

  return (
    <AppShell>
      <TaskOrganizer initialState={initialState} userId={staff.id} staff={staffList ?? []} />
    </AppShell>
  );
}
