import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, getErrorMessage } from "../api/client.js";
import ErrorBanner from "../components/ErrorBanner.jsx";
import FormField from "../components/FormField.jsx";
import LoadingState from "../components/LoadingState.jsx";
import PageHeader from "../components/PageHeader.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { formatDateOnly, formatHours } from "../utils/labels.js";

const statusOptions = [
  { value: "", label: "All statuses" },
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "ON_HOLD", label: "On hold" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const priorityOptions = [
  { value: "", label: "All priorities" },
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];

const emptyTotals = { workOrders: 0, open: 0, inProgress: 0, completed: 0, hours: 0 };

export default function WorkOrdersReportPage() {
  const [workOrders, setWorkOrders] = useState([]);
  const [totals, setTotals] = useState(emptyTotals);
  const [sites, setSites] = useState([]);
  const [filters, setFilters] = useState({ search: "", status: "", priority: "", siteId: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(nextFilters = filters) {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (nextFilters.search) params.search = nextFilters.search;
      if (nextFilters.status) params.status = nextFilters.status;
      if (nextFilters.priority) params.priority = nextFilters.priority;
      if (nextFilters.siteId) params.siteId = nextFilters.siteId;
      const response = await api.get("/api/reports/work-orders", { params });
      setWorkOrders(response.data.workOrders || []);
      setTotals(response.data.totals || emptyTotals);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load work orders report"));
      setWorkOrders([]);
      setTotals(emptyTotals);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    api
      .get("/api/sites")
      .then((res) => setSites(res.data || []))
      .catch(() => setSites([]));
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateFilter(event) {
    setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  const cards = useMemo(
    () => [
      { label: "Work orders", value: totals.workOrders ?? 0 },
      { label: "Open", value: totals.open ?? 0 },
      { label: "In progress", value: totals.inProgress ?? 0 },
      { label: "Completed", value: totals.completed ?? 0 },
      { label: "Hours logged", value: formatHours(totals.hours) },
    ],
    [totals],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Work Orders Report"
        description="Work-orders list for reporting: every work order you can access, newest first, with status, assignment, and hours logged."
      />
      <ErrorBanner message={error} />

      <form
        className="grid gap-4 rounded border border-stone-200 bg-white p-6 shadow-[0_2px_2px_0_rgba(0,0,0,0.1)] md:grid-cols-2 lg:grid-cols-5"
        onSubmit={(event) => {
          event.preventDefault();
          load(filters);
        }}
      >
        <FormField label="Search" name="search" value={filters.search} onChange={updateFilter} placeholder="Code, title, asset, site, assignee" />
        <FormField label="Status" name="status" as="select" value={filters.status} onChange={updateFilter} options={statusOptions} />
        <FormField label="Priority" name="priority" as="select" value={filters.priority} onChange={updateFilter} options={priorityOptions} />
        <FormField
          label="Site"
          name="siteId"
          as="select"
          value={filters.siteId}
          onChange={updateFilter}
          options={[
            { value: "", label: "All sites" },
            ...sites.map((site) => ({ value: site.id, label: site.name })),
          ]}
        />
        <div className="flex items-end">
          <button type="submit" className="w-full rounded bg-[#0176d3] px-4 py-2 text-sm font-semibold text-white">
            Apply filters
          </button>
        </div>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => (
          <div key={card.label} className="rounded border border-stone-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-stone-500">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-stone-900">{card.value}</p>
          </div>
        ))}
      </div>

      {loading ? <LoadingState label="Loading work orders..." /> : null}

      {!loading ? (
        <div className="overflow-hidden rounded border border-stone-200 bg-white shadow-[0_2px_2px_0_rgba(0,0,0,0.1)]">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-stone-100/70 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-4 py-3">Work order</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Site</th>
                <th className="px-4 py-3">Asset</th>
                <th className="px-4 py-3">Assignee</th>
                <th className="px-4 py-3 text-right">Hours</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {workOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-stone-500">
                    No work orders for this filter.
                  </td>
                </tr>
              ) : (
                workOrders.map((order) => (
                  <tr key={order.id} className="border-t border-stone-200">
                    <td className="px-4 py-3">
                      <Link className="text-[#032d60] hover:underline" to={`/workorders/${order.id}`}>
                        {order.code}
                      </Link>
                      <span className="block text-stone-600">{order.title}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge value={order.status} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge value={order.priority} />
                    </td>
                    <td className="px-4 py-3 text-stone-600">{order.site?.name || "—"}</td>
                    <td className="px-4 py-3 text-stone-600">{order.asset?.name || "No asset"}</td>
                    <td className="px-4 py-3">{order.assignee?.name || order.assignee?.email || "Unassigned"}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatHours(order.totalHours ?? 0)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-stone-600">{formatDateOnly(order.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
