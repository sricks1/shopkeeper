import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/types/database.types";

export type StaffRole = Enums<"staff_role">;

export interface CurrentStaff {
  id: string;
  display_name: string;
  role: StaffRole;
}

export async function getCurrentStaff(): Promise<CurrentStaff | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("staff")
    .select("id, display_name, role")
    .single();
  return data ?? null;
}

export function canManageTools(role: StaffRole | null | undefined): boolean {
  return role === "owner" || role === "shop_master";
}
