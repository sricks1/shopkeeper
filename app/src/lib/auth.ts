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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("staff")
    .select("id, display_name, role")
    .eq("id", user.id)
    .single();
  return data ?? null;
}

// Who's actually signed in — the auth identity plus their staff row (if any).
// Distinct from getCurrentStaff because a signed-in user who is NOT active
// staff still has an email we want to surface: RLS silently blocks all their
// reads/writes, so the app must tell them why it looks broken.
export interface CurrentAccount {
  email: string | null;
  staff: CurrentStaff | null;
}

export async function getCurrentAccount(): Promise<CurrentAccount> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { email: null, staff: null };
  const { data } = await supabase
    .from("staff")
    .select("id, display_name, role")
    .eq("id", user.id)
    .maybeSingle();
  return { email: user.email ?? null, staff: data ?? null };
}

export function canManageTools(role: StaffRole | null | undefined): boolean {
  return role === "owner" || role === "shop_master";
}
