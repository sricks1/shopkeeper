"use client";

import { Wrench } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import { NAV_ITEMS } from "@/components/nav/navItems";
import { useUnreadCount } from "@/components/nav/useUnreadCount";

function UnreadDot({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
      {count > 9 ? "9+" : count}
    </span>
  );
}

// Desktop sidebar + mobile bottom tab bar, sharing one nav config and one
// unread count. AppShell (server) renders this once inside the (app) layout.
export default function AppNav({
  identity,
  notStaff,
  initialUnread,
}: {
  identity: string | null;
  notStaff: boolean;
  initialUnread: number;
}) {
  const pathname = usePathname();
  const unread = useUnreadCount(initialUnread);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col bg-navy pt-[env(safe-area-inset-top)] md:flex">
        <div className="flex items-center gap-2.5 px-4 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-field bg-accent">
            <Wrench size={16} className="text-white" strokeWidth={2.5} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold leading-tight text-white">ShopKeeper</p>
            <p className="text-[10px] uppercase tracking-widest text-white/40">The Joinery</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3 pt-2">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`relative flex items-center gap-2.5 rounded-field px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-white/10 text-white"
                    : "text-white/50 hover:bg-white/5 hover:text-white/80"
                }`}
              >
                {active && (
                  <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-accent" />
                )}
                <span className="relative">
                  <Icon size={17} strokeWidth={active ? 2.25 : 1.75} aria-hidden="true" />
                  {href === "/notifications" && <UnreadDot count={unread} />}
                </span>
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center justify-between gap-2 border-t border-white/10 px-4 py-3">
          {identity && (
            <span
              className={`min-w-0 truncate text-xs font-medium ${notStaff ? "text-red-300" : "text-white/60"}`}
              title={identity}
            >
              {identity}
            </span>
          )}
          <LogoutButton />
        </div>
      </aside>

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-zinc-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="flex">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                  active ? "text-brand" : "text-zinc-400 hover:text-zinc-600"
                }`}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-accent" />
                )}
                <span className="relative">
                  <Icon size={20} strokeWidth={active ? 2.5 : 1.75} aria-hidden="true" />
                  {href === "/notifications" && <UnreadDot count={unread} />}
                </span>
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
