import { statusLabel } from "../utils/labels.js";

const toneByValue = {
  OPERATIONAL: "bg-[#cdefc4] text-[#194e31]",
  OPEN: "bg-[#d8e6fe] text-[#0b5cab]",
  IN_PROGRESS: "bg-[#f9e3b6] text-[#8c4b02]",
  ON_HOLD: "bg-[#e5e5e5] text-[#181818]",
  COMPLETED: "bg-[#cdefc4] text-[#194e31]",
  CANCELLED: "bg-[#e5e5e5] text-[#181818]",
  CRITICAL: "bg-[#fddde3] text-[#8e030f]",
  HIGH: "bg-[#f9e3b6] text-[#8c4b02]",
  MEDIUM: "bg-[#d8e6fe] text-[#0b5cab]",
  LOW: "bg-[#e5e5e5] text-[#181818]",
  DEGRADED: "bg-[#f9e3b6] text-[#8c4b02]",
  OFFLINE: "bg-[#fddde3] text-[#8e030f]",
  DECOMMISSIONED: "bg-[#e5e5e5] text-[#181818]",
  PENDING: "bg-[#f9e3b6] text-[#8c4b02]",
  APPROVED: "bg-[#cdefc4] text-[#194e31]",
  REJECTED: "bg-[#fddde3] text-[#8e030f]",
};

export default function StatusBadge({ value, label }) {
  const tone = toneByValue[value] || "bg-[#e5e5e5] text-[#181818]";
  return (
    <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${tone}`}>
      {label || statusLabel(value)}
    </span>
  );
}
