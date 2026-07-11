import type { ComponentProps } from "react";

// The one canonical field style. Every text input, textarea, and select in the
// app shares it so forms can't drift apart again.
export const inputClasses =
  "w-full rounded-field border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-zinc-50 disabled:text-zinc-400";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={`${inputClasses} ${className ?? ""}`} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={`${inputClasses} ${className ?? ""}`} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={`${inputClasses} ${className ?? ""}`} {...props} />;
}
