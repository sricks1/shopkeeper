import type { ComponentProps } from "react";

type ButtonVariant = "primary" | "accent" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white hover:bg-brand-hover active:bg-brand-active",
  accent: "bg-accent text-white hover:bg-accent-hover",
  outline: "border border-brand/40 bg-white text-brand hover:bg-brand/5",
  ghost: "text-zinc-600 hover:bg-zinc-100",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: "gap-1 px-2.5 py-1.5 text-xs",
  md: "gap-1.5 px-3.5 py-2 text-sm",
};

export interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

// For <Link> CTAs and other non-<button> elements that need button styling.
export function buttonClasses({ variant = "primary", size = "md" }: ButtonStyleOptions = {}) {
  return `inline-flex items-center justify-center rounded-field font-semibold transition duration-100 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:pointer-events-none disabled:opacity-60 ${VARIANT_STYLES[variant]} ${SIZE_STYLES[size]}`;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & ButtonStyleOptions) {
  return (
    <button
      type={type}
      className={`${buttonClasses({ variant, size })} ${className ?? ""}`}
      {...props}
    />
  );
}
