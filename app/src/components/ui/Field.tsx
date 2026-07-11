import type { ReactNode } from "react";

// Label + control wrapper. Pass htmlFor (with a matching id on the control) for
// native inputs; omit it for custom widgets (pickers, button groups) and the
// label renders as a span so it doesn't claim an association it doesn't have.
export function Field({
  label,
  htmlFor,
  hint,
  error,
  action,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string | null;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const labelCls = "text-[13px] font-medium text-zinc-600";
  return (
    <div className={`flex flex-col gap-1 ${className ?? ""}`}>
      <div className="flex items-center justify-between gap-2">
        {htmlFor ? (
          <label htmlFor={htmlFor} className={labelCls}>
            {label}
          </label>
        ) : (
          <span className={labelCls}>{label}</span>
        )}
        {action}
      </div>
      {children}
      {hint && !error && <p className="text-xs text-zinc-400">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
