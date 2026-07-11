import { AlertTriangle } from "lucide-react";
import { getCurrentAccount } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "./LogoutButton";
import NavClient from "./NavClient";

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
      {/* Branded top bar */}
      <header className="sticky top-0 z-10 bg-[#0a112a]">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#e06829]">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
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

      {notStaff && (
        <div className="flex items-start gap-2 bg-red-600 px-4 py-2.5 text-xs font-medium text-white">
          <AlertTriangle size={15} className="mt-px shrink-0" />
          <span>
            Signed in as <span className="font-bold">{email}</span> — not a shop account. Nothing
            you change here will save. Sign out and sign back in with your Joinery email.
          </span>
        </div>
      )}

      <main className="flex-1 overflow-x-clip pb-20">{children}</main>
      <NavClient unreadCount={count ?? 0} />
    </div>
  );
}
