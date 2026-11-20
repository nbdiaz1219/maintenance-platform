import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, getErrorMessage } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import ErrorBanner from "../components/ErrorBanner.jsx";
import FormField from "../components/FormField.jsx";
import LoadingState from "../components/LoadingState.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { formatDateOnly, formatHours, todayInputDate } from "../utils/labels.js";

function defaultFromDate() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function HoursReportPage() {
  const { can } = useAuth();
  const [sites, setSites] = useState([]);
  const [users, setUsers] = useState([]);
  const [assets, setAssets] = useState([]);
  const [summary, setSummary] = useState({ rows: [], totals: { hours: 0, entries: 0, people: 0, assets: 0 } });
  const [filters, setFilters] = useState({
    from: defaultFromDate(),
    to: todayInputDate(),
    siteId: "",
    userId: "",
    assetId: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const filteredAssets = useMemo(() => {
    if (!filters.siteId) return assets;
    return assets.filter((asset) => asset.siteId === filters.siteId);
  }, [assets, filters.siteId]);

  async function loadMeta() {
    const [sitesRes, assetsRes] = await Promise.all([api.get("/api/sites"), api.get("/api/assets")]);
    setSites(sitesRes.data);
    setAssets(assetsRes.data);
    try {
      const assigneesRes = await api.get("/api/users/assignees");
      setUsers(assigneesRes.data);
    } catch {
      setUsers([]);
    }
  }

  async function loadSummary(nextFilters = filters) {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (nextFilters.from) params.from = nextFilters.from;
      if (nextFilters.to) params.to = nextFilters.to;
      if (nextFilters.siteId) params.siteId = nextFilters.siteId;
      if (nextFilters.userId) params.userId = nextFilters.userId;
      if (nextFilters.assetId) params.assetId = nextFilters.assetId;

      const response = await api.get("/api/time-entries/summary", { params });
      setSummary(response.data);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load hours report"));
      setSummary({ rows: [], totals: { hours: 0, entries: 0, people: 0, assets: 0 } });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!can("time-entries:report")) return;
    loadMeta()
      .then(() => loadSummary())
      .catch((err) => {
        setError(getErrorMessage(err, "Unable to load hours report"));
        setLoading(false);
      });
  }, [can]);

  function updateFilter(event) {
    const { name, value } = event.target;
    setFilters((current) => {
      const next = { ...current, [name]: value };
      if (name === "siteId") next.assetId = "";
      return next;
    });
  }

  function handleFilterSubmit(event) {
    event.preventDefault();
    loadSummary(filters);
  }

  if (!can("time-entries:report")) {
    return <ErrorBanner message="You do not have access to the hours report." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hours report"
        description="Hours logged per person and per asset across work orders you can access."
      />
      <ErrorBanner message={error} />

      <form
        className="grid gap-4 rounded border border-stone-200 bg-white p-6 shadow-[0_2px_2px_0_rgba(0,0,0,0.1)] md:grid-cols-2 lg:grid-cols-3"
        onSubmit={handleFilterSubmit}
      >
        <FormField label="From" name="from" type="date" value={filters.from} onChange={updateFilter} />
        <FormField label="To" name="to" type="date" value={filters.to} onChange={updateFilter} />
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
        <FormField
          label="Person"
          name="userId"
          as="select"
          value={filters.userId}
          onChange={updateFilter}
          options={[
            { value: "", label: "All people" },
            ...users.map((person) => ({
              value: person.id,
              label: person.name || person.email,
            })),
          ]}
        />
        <FormField
          label="Asset"
          name="assetId"
          as="select"
          value={filters.assetId}
          onChange={updateFilter}
          options={[
            { value: "", label: "All assets" },
            ...filteredAssets.map((asset) => ({ value: asset.id, label: asset.name })),
          ]}
        />
        <div className="flex items-end">
          <button
            type="submit"
            className="w-full rounded bg-[#0176d3] px-4 py-2 text-sm font-semibold text-white"
          >
            Apply filters
          </button>
        </div>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total hours", value: formatHours(summary.totals?.hours) },
          { label: "Entries", value: summary.totals?.entries ?? 0 },
          { label: "People", value: summary.totals?.people ?? 0 },
          { label: "Assets", value: summary.totals?.assets ?? 0 },
        ].map((card) => (
          <div key={card.label} className="rounded border border-stone-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-stone-500">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-stone-900">{card.value}</p>
          </div>
        ))}
      </div>

      {loading ? <LoadingState label="Loading hours..." /> : null}

      {!loading ? (
        <div className="overflow-hidden rounded border border-stone-200 bg-white shadow-[0_2px_2px_0_rgba(0,0,0,0.1)]">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-stone-100/70 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-4 py-3">Person</th>
                <th className="px-4 py-3">Asset</th>
                <th className="px-4 py-3">Site</th>
                <th className="px-4 py-3 text-right">Hours</th>
                <th className="px-4 py-3 text-right">Entries</th>
              </tr>
            </thead>
            <tbody>
              {summary.rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-stone-500">
                    No hours logged for this filter.
                  </td>
                </tr>
              ) : (
                summary.rows.map((row) => (
                  <tr key={`${row.userId}-${row.assetId || "none"}`} className="border-t border-stone-200">
                    <td className="px-4 py-3 font-medium">{row.user?.name || row.user?.email}</td>
                    <td className="px-4 py-3">
                      {row.asset ? (
                        <Link className="text-[#032d60] hover:underline" to={`/assets/${row.asset.id}`}>
                          {row.asset.name}
                        </Link>
                      ) : (
                        <span className="text-stone-500">No asset</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-stone-600">{row.site?.name || "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatHours(row.hours)}</td>
                    <td className="px-4 py-3 text-right text-stone-500">{row.entryCount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      {!loading && summary.entries?.length ? (
        <div className="overflow-hidden rounded border border-stone-200 bg-white shadow-[0_2px_2px_0_rgba(0,0,0,0.1)]">
          <div className="border-b border-stone-200 px-4 py-3">
            <h3 className="text-sm font-semibold text-stone-700">Recent entries</h3>
          </div>
          <table className="min-w-full text-left text-sm">
            <thead className="bg-stone-100/70 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Person</th>
                <th className="px-4 py-3">Work order</th>
                <th className="px-4 py-3">Asset</th>
                <th className="px-4 py-3 text-right">Hours</th>
                <th className="px-4 py-3">Note</th>
              </tr>
            </thead>
            <tbody>
              {summary.entries.slice(0, 50).map((entry) => (
                <tr key={entry.id} className="border-t border-stone-200">
                  <td className="whitespace-nowrap px-4 py-3 text-stone-600">{formatDateOnly(entry.workDate)}</td>
                  <td className="px-4 py-3">{entry.user?.name || entry.user?.email}</td>
                  <td className="px-4 py-3">
                    <Link className="text-[#032d60] hover:underline" to={`/workorders/${entry.workOrder.id}`}>
                      {entry.workOrder.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-stone-600">{entry.workOrder.asset?.name || "No asset"}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatHours(entry.hours)}</td>
                  <td className="px-4 py-3 text-stone-500">{entry.note || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
