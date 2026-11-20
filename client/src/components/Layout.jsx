import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

const navItems = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/sites", label: "Sites" },
  { to: "/assets", label: "Assets" },
  { to: "/workorders", label: "Work Orders" },
  { to: "/greentagging", label: "Greentagging checklist" },
  { to: "/inventory", label: "Inventory" },
  { to: "/sops", label: "Department SOPs" },
  { to: "/reports/hours", label: "Hours report", permission: "time-entries:report" },
  { to: "/reports/submitted", label: "Submitted Reports", permission: "time-entries:submitted" },
  { to: "/reports/work-orders", label: "Work Orders Report", permission: "workorders:read" },
  { to: "/access/request", label: "Request access" },
  { to: "/admin/users", label: "User access", permission: "users:read" },
  { to: "/admin/access-requests", label: "Access requests", permission: "access-requests:read" },
  { to: "/admin/audit", label: "Audit log", permission: "audit:read" },
];

function navClassName({ isActive }) {
  return [
    "shrink-0 border-l-4 px-3 py-2 text-left text-[13px] lg:w-full",
    isActive
      ? "border-[#0176d3] bg-[#eef4ff] font-bold text-[#0176d3]"
      : "border-transparent font-normal text-[#181818] hover:bg-[#f3f3f3]",
  ].join(" ");
}

export default function Layout() {
  const { user, logout, can, roleLabel } = useAuth();
  const [version, setVersion] = useState("");

  useEffect(() => {
    api
      .get("/api/version")
      .then((response) => setVersion(response.data.version || ""))
      .catch(() => setVersion(""));
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[#f3f3f3] text-[#181818] lg:flex-row">
      <aside className="flex shrink-0 flex-col border-b border-[#e5e5e5] bg-white lg:min-h-screen lg:w-56 lg:border-b-0 lg:border-r">
        <div className="border-b border-[#e5e5e5] px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#0176d3]">EMAT</p>
          <h1 className="text-sm font-bold text-[#181818]">Tracking Database</h1>
          {version ? <p className="mt-1 text-[11px] text-[#706e6b]">Version {version}</p> : null}
        </div>

        <nav className="flex gap-1 overflow-x-auto p-2 lg:flex-1 lg:flex-col lg:overflow-visible" aria-label="Application">
          {navItems
            .filter((item) => !item.permission || can(item.permission))
            .map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={navClassName}>
                {item.label}
              </NavLink>
            ))}
        </nav>

        <div className="border-t border-[#e5e5e5] px-4 py-3">
          <p className="truncate text-[13px] font-bold text-[#181818]">{user?.name || user?.email}</p>
          <p className="mt-0.5 text-[11px] text-[#706e6b]">{roleLabel}</p>
          <button
            type="button"
            onClick={logout}
            className="mt-3 rounded border border-[#c9c9c9] bg-white px-3 py-1.5 text-[13px] text-[#181818] hover:bg-[#f3f3f3]"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-4 lg:px-6 lg:py-5">
        <Outlet />
      </main>
    </div>
  );
}
