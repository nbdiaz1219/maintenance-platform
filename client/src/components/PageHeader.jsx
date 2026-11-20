import { Link } from "react-router-dom";
import StatusBadge from "../components/StatusBadge.jsx";

export default function PageHeader({ title, description, action }) {
  return (
    <div className="mb-4 flex flex-col gap-3 border-b border-[#e5e5e5] pb-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h2 className="text-xl font-bold text-[#181818]">{title}</h2>
        {description ? <p className="mt-1 max-w-3xl text-[13px] leading-5 text-[#444444]">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function RecordLink({ to, title, subtitle, badge }) {
  return (
    <Link to={to} className="flow-card block p-3 hover:border-[#0176d3]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-[#0176d3]">{title}</p>
          {subtitle ? <p className="mt-1 text-[13px] text-[#444444]">{subtitle}</p> : null}
        </div>
        {badge ? <StatusBadge value={badge} /> : null}
      </div>
    </Link>
  );
}

export function EmptyState({ message }) {
  return (
    <p className="rounded border border-dashed border-[#c9c9c9] bg-white px-4 py-8 text-center text-[13px] text-[#444444]">
      {message}
    </p>
  );
}
