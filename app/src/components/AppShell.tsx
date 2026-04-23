import { createClient } from "@/lib/supabase/server";
import NavClient from "./NavClient";

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .is("acknowledged_at", null);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <main className="flex-1 pb-20">{children}</main>
      <NavClient unreadCount={count ?? 0} />
    </div>
  );
}
