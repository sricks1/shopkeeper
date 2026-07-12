"use client";

export interface StaffOption {
  id: string;
  display_name: string;
}

interface StaffPickerProps {
  staff: StaffOption[];
  value: string | null;
  onChange: (id: string | null) => void;
  /** Label for the empty option. Defaults to "Unassigned". */
  unassignedLabel?: string;
  disabled?: boolean;
}

const UNASSIGNED = "__unassigned__";

const selectCls =
  "w-full rounded-field border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

export default function StaffPicker({
  staff,
  value,
  onChange,
  unassignedLabel = "Unassigned",
  disabled,
}: StaffPickerProps) {
  return (
    <select
      value={value ?? UNASSIGNED}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value === UNASSIGNED ? null : e.target.value)}
      className={selectCls}
    >
      <option value={UNASSIGNED}>{unassignedLabel}</option>
      {staff.map((s) => (
        <option key={s.id} value={s.id}>
          {s.display_name}
        </option>
      ))}
    </select>
  );
}
