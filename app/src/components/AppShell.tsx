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
      {/* Branded top bar */}
      <header className="sticky top-0 z-10 bg-[#0a112a]">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#e06829]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
            </div>
            <span className="text-sm font-bold text-white">ShopKeeper</span>
          </div>
          <span className="text-[10px] font-medium uppercase tracking-widest text-white/30">
            The Joinery
          </span>
        </div>
      </header>

      <main className="flex-1 pb-20">{children}</main>
      <NavClient unreadCount={count ?? 0} />
    </div>
  );
}
