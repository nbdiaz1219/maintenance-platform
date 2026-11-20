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
    "rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300 ease-out",
    isActive
      ? "bg-stone-900 text-white"
      : "text-stone-600 hover:bg-stone-100 hover:text-stone-900",
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
    <div className="min-h-screen bg-[#f4f4f1] text-stone-900">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row lg:px-6">
        <aside className="flex shrink-0 flex-col gap-6 rounded-2xl border border-stone-200 bg-white p-6 text-stone-900 shadow-sm lg:w-64">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-800/90">
              EMAT Tracking Database
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight">Navy Sustainment</h1>
            {version ? <p className="mt-2 text-xs text-stone-400">V{version}</p> : null}
          </div>

          <nav className="flex flex-col gap-1.5">
            {navItems
              .filter((item) => !item.permission || can(item.permission))
              .map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} className={navClassName}>
                  {item.label}
                </NavLink>
              ))}
          </nav>

          <div className="mt-auto rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <p className="text-sm font-medium">{user?.name || user?.email}</p>
            <p className="mt-1 text-xs text-stone-500">{roleLabel}</p>
            <button
              type="button"
              onClick={logout}
              className="mt-4 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm transition-all duration-300 hover:bg-stone-100"
            >
              Sign out
            </button>
          </div>
        </aside>

        <main className="flow-page flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
