import { AlertTriangle, Wrench } from "lucide-react";
import NavProgress from "@/components/NavProgress";
import AppNav from "@/components/nav/AppNav";
import { getCurrentAccount } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "./LogoutButton";

// Sentinel UUID so the `.or()` filter is always valid even when there's no
// current staff (matches nothing rather than erroring).
const NO_STAFF = "00000000-0000-0000-0000-000000000000";

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { email, staff } = await getCurrentAccount();
  // Signed in but not an active staff row: RLS blocks everything, so the app
  // looks empty and every save silently fails. Name it so it's obvious.
  const notStaff = email != null && staff == null;
  const identity = staff?.display_name ?? email;
  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .is("acknowledged_at", null)
    .or(`recipient_id.is.null,recipient_id.eq.${staff?.id ?? NO_STAFF}`);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <NavProgress />
      {/* Mobile top bar — the sidebar carries the branding at md+ */}
      <header className="sticky top-0 z-10 bg-navy pt-[env(safe-area-inset-top)] md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-field bg-accent">
              <Wrench size={14} className="text-white" strokeWidth={2.5} aria-hidden="true" />
            </div>
            <span className="text-sm font-bold text-white">ShopKeeper</span>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            {identity && (
              <span
                className={`max-w-[40vw] truncate text-xs font-medium ${
                  notStaff ? "text-red-300" : "text-white/60"
                }`}
                title={email ?? undefined}
              >
                {identity}
              </span>
            )}
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col md:pl-60">
        {notStaff && (
          <div className="flex items-start gap-2 bg-red-600 px-4 py-2.5 text-xs font-medium text-white">
            <AlertTriangle size={15} className="mt-px shrink-0" />
            <span>
              Signed in as <span className="font-bold">{email}</span> — not a shop account. Nothing
              you change here will save. Sign out and sign back in with your Joinery email.
            </span>
          </div>
        )}
        <main className="mx-auto w-full max-w-5xl flex-1 overflow-x-clip pb-24 md:pb-10">
          {children}
        </main>
      </div>

      <AppNav identity={identity ?? null} notStaff={notStaff} initialUnread={count ?? 0} />
    </div>
  );
}
