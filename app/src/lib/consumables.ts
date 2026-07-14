import type { SegmentedOption } from "@/components/ui/Segmented";
import type { Enums } from "@/lib/types/database.types";

export type ConsumableKind = Enums<"consumable_kind">;

// Consumable vs. part: shared labels + the segmented options used by the
// create/edit forms and the inventory filter, so the vocabulary stays in one
// place.
export const KIND_LABEL: Record<ConsumableKind, string> = {
  consumable: "Consumable",
  part: "Part",
};

export const KIND_OPTIONS: SegmentedOption<ConsumableKind>[] = [
  { value: "consumable", label: "Consumable" },
  { value: "part", label: "Part" },
];

export function kindHint(kind: ConsumableKind): string {
  return kind === "part"
    ? "Ordered when a repair needs it — stock tracking optional."
    : "Kept on the shelf — stock is tracked in and out.";
}
