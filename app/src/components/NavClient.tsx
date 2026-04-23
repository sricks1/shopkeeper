"use client";

import { Bell, Package, Wrench } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/tools", label: "Tools", icon: Wrench },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/notifications", label: "Alerts", icon: Bell },
];

export default function NavClient({ unreadCount }: { unreadCount: number }) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 border-t border-zinc-200 bg-white">
      <div className="flex">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          const showBadge = href === "/notifications" && unreadCount > 0;
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                active ? "text-[#324168]" : "text-zinc-400 hover:text-zinc-600"
              }`}
            >
              <div className="relative">
                <Icon size={20} strokeWidth={active ? 2.5 : 1.75} aria-hidden="true" />
                {showBadge && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#e06829] text-[10px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
