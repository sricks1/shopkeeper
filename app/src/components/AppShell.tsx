"use client";

import { Bell, Package, Wrench } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/tools", label: "Tools", icon: Wrench },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/notifications", label: "Alerts", icon: Bell },
];

function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 border-t border-zinc-200 bg-white">
      <div className="flex">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                active ? "text-[#324168]" : "text-zinc-400 hover:text-zinc-600"
              }`}
            >
              <Icon
                size={20}
                strokeWidth={active ? 2.5 : 1.75}
                aria-hidden="true"
              />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <main className="flex-1 pb-20">{children}</main>
      <BottomNav />
    </div>
  );
}
