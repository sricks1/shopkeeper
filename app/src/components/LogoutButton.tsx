"use client";

import { createClient } from "@/lib/supabase/client";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-white/50 transition-colors hover:text-white/80"
      aria-label="Sign out"
    >
      <LogOut size={14} />
    </button>
  );
}
