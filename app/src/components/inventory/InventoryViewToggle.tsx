import { Package, ShoppingCart } from "lucide-react";
import { SegmentedNav } from "@/components/ui/Segmented";

// Stock | Orders switch shown at the top of both inventory views.
export default function InventoryViewToggle({ current }: { current: "stock" | "orders" }) {
  return (
    <SegmentedNav
      options={[
        { value: "stock", label: "Stock", icon: Package },
        { value: "orders", label: "Orders", icon: ShoppingCart },
      ]}
      value={current}
      hrefFor={(v) => (v === "stock" ? "/inventory" : "/inventory/orders")}
      className="mb-4"
    />
  );
}
