import type { ReactNode } from "react";

// The title row every list/detail page opens with. Subtitle takes a ReactNode
// so counts can embed links (e.g. "12 items · 3 on order →").
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <h1 className="truncate text-lg font-semibold text-zinc-900">{title}</h1>
        {subtitle && <p className="text-xs text-zinc-500">{subtitle}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}
