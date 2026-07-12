import type { LucideIcon } from "lucide-react";
import Link from "next/link";

export interface SegmentedOption<V extends string> {
  value: V;
  label: string;
  icon?: LucideIcon;
}

const containerCls = "flex gap-1 rounded-field bg-zinc-200/60 p-1";

function itemCls(active: boolean) {
  return `flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
    active ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
  }`;
}

function OptionContent<V extends string>({ option }: { option: SegmentedOption<V> }) {
  const Icon = option.icon;
  return (
    <>
      {Icon && <Icon size={13} />}
      {option.label}
    </>
  );
}

// Link-based segmented control for view switching (each option is a URL).
export function SegmentedNav<V extends string>({
  options,
  value,
  hrefFor,
  className,
}: {
  options: SegmentedOption<V>[];
  value: V;
  hrefFor: (value: V) => string;
  className?: string;
}) {
  return (
    <nav className={`${containerCls} ${className ?? ""}`}>
      {options.map((o) => (
        <Link key={o.value} href={hrefFor(o.value)} className={itemCls(o.value === value)}>
          <OptionContent option={o} />
        </Link>
      ))}
    </nav>
  );
}

// Button-based segmented control for local state (form toggles, filters).
export function SegmentedButtons<V extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: SegmentedOption<V>[];
  value: V;
  onChange: (value: V) => void;
  className?: string;
}) {
  return (
    <div className={`${containerCls} ${className ?? ""}`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={itemCls(o.value === value)}
        >
          <OptionContent option={o} />
        </button>
      ))}
    </div>
  );
}
