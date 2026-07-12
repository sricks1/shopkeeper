import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";

export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-card border-2 border-dashed border-zinc-200 px-4 py-8 text-center">
      <Icon size={22} className="text-zinc-300" />
      <p className="text-sm font-medium text-zinc-500">{title}</p>
      {hint && <p className="text-xs text-zinc-400">{hint}</p>}
      {action && (
        <Link href={action.href} className={`mt-2 ${buttonClasses({ size: "sm" })}`}>
          {action.label}
        </Link>
      )}
    </div>
  );
}
