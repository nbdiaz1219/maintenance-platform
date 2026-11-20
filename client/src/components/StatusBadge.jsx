import { statusLabel } from "../utils/labels.js";

const toneByValue = {
  OPERATIONAL: "bg-orange-50 text-orange-800 ring-orange-200",
  OPEN: "bg-sky-50 text-sky-800 ring-sky-200",
  IN_PROGRESS: "bg-amber-50 text-amber-800 ring-amber-200",
  ON_HOLD: "bg-white text-stone-600 ring-stone-200",
  COMPLETED: "bg-orange-50 text-orange-800 ring-orange-200",
  CANCELLED: "bg-white text-stone-600 ring-stone-200",
  CRITICAL: "bg-rose-50 text-rose-700 ring-rose-200",
  HIGH: "bg-orange-50 text-orange-800 ring-orange-200",
  MEDIUM: "bg-amber-50 text-amber-800 ring-amber-200",
  LOW: "bg-white text-stone-600 ring-stone-200",
  DEGRADED: "bg-amber-50 text-amber-800 ring-amber-200",
  OFFLINE: "bg-rose-50 text-rose-700 ring-rose-200",
  DECOMMISSIONED: "bg-white text-stone-600 ring-stone-200",
  PENDING: "bg-amber-50 text-amber-800 ring-amber-200",
  APPROVED: "bg-orange-50 text-orange-800 ring-orange-200",
  REJECTED: "bg-rose-50 text-rose-700 ring-rose-200",
};

export default function StatusBadge({ value, label }) {
  const tone = toneByValue[value] || "bg-white text-stone-600 ring-stone-200";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1 ring-inset ${tone}`}>
      {label || statusLabel(value)}
    </span>
  );
}
