import { FolderTree, LayoutGrid } from "lucide-react";
import Link from "next/link";

// Segmented control that makes the Board and Organizer read as two views of one
// thing rather than two separate screens.
export default function TaskViewToggle({ current }: { current: "board" | "organize" }) {
  const base =
    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors";
  const on = "bg-white text-zinc-900 shadow-sm";
  const off = "text-zinc-500 hover:text-zinc-700";
  return (
    <div className="flex items-center gap-1 rounded-xl bg-zinc-200/60 p-1">
      <Link href="/tasks" className={`${base} ${current === "board" ? on : off}`}>
        <LayoutGrid size={15} />
        Board
      </Link>
      <Link href="/tasks/organize" className={`${base} ${current === "organize" ? on : off}`}>
        <FolderTree size={15} />
        Organize
      </Link>
    </div>
  );
}
