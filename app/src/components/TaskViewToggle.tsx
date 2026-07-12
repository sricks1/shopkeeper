import { FolderTree, LayoutGrid } from "lucide-react";
import { SegmentedNav } from "@/components/ui/Segmented";

// Segmented control that makes the Board and Organizer read as two views of one
// thing rather than two separate screens.
export default function TaskViewToggle({ current }: { current: "board" | "organize" }) {
  return (
    <SegmentedNav
      options={[
        { value: "board", label: "Board", icon: LayoutGrid },
        { value: "organize", label: "Organize", icon: FolderTree },
      ]}
      value={current}
      hrefFor={(v) => (v === "board" ? "/tasks" : "/tasks/organize")}
    />
  );
}
