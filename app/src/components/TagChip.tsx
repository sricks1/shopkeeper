import { X } from "lucide-react";

// A tag chip. With a `color` (hex like '#324168') it fills the chip and uses
// white text; otherwise it falls back to a neutral zinc chip. Pass `onRemove`
// to render a removable variant (used in the tag editor).
export function TagChip({
  name,
  color,
  onRemove,
}: {
  name: string;
  color?: string | null;
  onRemove?: () => void;
}) {
  const styled = color
    ? { backgroundColor: color, color: "#fff" }
    : undefined;
  return (
    <span
      style={styled}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        color ? "" : "bg-zinc-100 text-zinc-600 ring-1 ring-inset ring-zinc-500/20"
      }`}
    >
      {name}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="-mr-0.5 rounded-full p-0.5 opacity-70 hover:opacity-100"
          aria-label={`Remove ${name}`}
        >
          <X size={11} />
        </button>
      )}
    </span>
  );
}
