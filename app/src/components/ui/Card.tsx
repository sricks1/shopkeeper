import type { ReactNode } from "react";

type CardPadding = "none" | "sm" | "md";

const PADDING_STYLES: Record<CardPadding, string> = {
  none: "",
  sm: "p-3",
  md: "p-4",
};

// For <Link> rows and other non-<div> elements that need the card surface.
export function cardClasses(padding: CardPadding = "md") {
  return `rounded-card bg-white shadow-sm ring-1 ring-zinc-200 ${PADDING_STYLES[padding]}`;
}

export function Card({
  padding = "md",
  className,
  children,
}: {
  padding?: CardPadding;
  className?: string;
  children: ReactNode;
}) {
  return <div className={`${cardClasses(padding)} ${className ?? ""}`}>{children}</div>;
}
