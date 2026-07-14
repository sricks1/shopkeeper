import { type ConsumableKind, KIND_LABEL } from "@/lib/consumables";

// Small pill marking a catalog row as a Part vs. Consumable. Parts are the
// exception worth flagging, so lists typically render this only for parts;
// detail views can show it for either.
export default function KindChip({ kind }: { kind: ConsumableKind }) {
  const cls =
    kind === "part"
      ? "border-brand/30 bg-brand/5 text-brand"
      : "border-zinc-200 bg-zinc-50 text-zinc-500";
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold not-italic ${cls}`}
    >
      {KIND_LABEL[kind]}
    </span>
  );
}
