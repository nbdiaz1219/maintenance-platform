import { useEffect, useState } from "react";
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

export default function SubmittedReportsPage() {
  const { can } = useAuth();
  const canReport = can("time-entries:report");
  const [entries, setEntries] = useState([]);
  const [totals, setTotals] = useState({ hours: 0, entries: 0, people: 0 });
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({ from: defaultFromDate(), to: todayInputDate(), userId: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(nextFilters = filters) {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (nextFilters.from) params.from = nextFilters.from;
      if (nextFilters.to) params.to = nextFilters.to;
      if (canReport && nextFilters.userId) params.userId = nextFilters.userId;
      const response = await api.get("/api/time-entries/submitted", { params });
      setEntries(response.data.entries || []);
      setTotals(response.data.totals || { hours: 0, entries: 0, people: 0 });
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load submitted reports"));
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (canReport) {
      api
        .get("/api/users/assignees")
        .then((res) => setUsers(res.data))
        .catch(() => setUsers([]));
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateFilter(event) {
    setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Submitted Reports"
        description={
          canReport
            ? "Time reports submitted by the team, newest first."
            : "Time reports you have submitted, newest first."
        }
      />
      <ErrorBanner message={error} />

      <form
        className="grid gap-4 rounded border border-stone-200 bg-white p-6 shadow-[0_2px_2px_0_rgba(0,0,0,0.1)] md:grid-cols-2 lg:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault();
          load(filters);
        }}
      >
        <FormField label="From" name="from" type="date" value={filters.from} onChange={updateFilter} />
        <FormField label="To" name="to" type="date" value={filters.to} onChange={updateFilter} />
        {canReport ? (
          <FormField
            label="Person"
            name="userId"
            as="select"
            value={filters.userId}
            onChange={updateFilter}
            options={[
              { value: "", label: "All people" },
              ...users.map((person) => ({ value: person.id, label: person.name || person.email })),
            ]}
          />
        ) : null}
        <div className="flex items-end">
          <button type="submit" className="w-full rounded bg-[#0176d3] px-4 py-2 text-sm font-semibold text-white">
            Apply filters
          </button>
        </div>
      </form>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Submitted hours", value: formatHours(totals.hours) },
          { label: "Reports", value: totals.entries ?? 0 },
          { label: "People", value: totals.people ?? 0 },
        ].map((card) => (
          <div key={card.label} className="rounded border border-stone-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-stone-500">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-stone-900">{card.value}</p>
          </div>
        ))}
      </div>

      {loading ? <LoadingState label="Loading submitted reports..." /> : null}

      {!loading ? (
        <div className="overflow-hidden rounded border border-stone-200 bg-white shadow-[0_2px_2px_0_rgba(0,0,0,0.1)]">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-stone-100/70 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Submitted by</th>
                <th className="px-4 py-3">Work order</th>
                <th className="px-4 py-3">Asset</th>
                <th className="px-4 py-3">Site</th>
                <th className="px-4 py-3 text-right">Hours</th>
                <th className="px-4 py-3">Note</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-stone-500">
                    No submitted reports for this filter.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="border-t border-stone-200">
                    <td className="whitespace-nowrap px-4 py-3 text-stone-600">{formatDateOnly(entry.workDate)}</td>
                    <td className="px-4 py-3">{entry.user?.name || entry.user?.email || "—"}</td>
                    <td className="px-4 py-3">
                      {entry.workOrder ? (
                        <Link className="text-[#032d60] hover:underline" to={`/workorders/${entry.workOrder.id}`}>
                          {entry.workOrder.code}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-stone-600">{entry.workOrder?.asset?.name || "No asset"}</td>
                    <td className="px-4 py-3 text-stone-600">{entry.workOrder?.site?.name || "—"}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatHours(entry.hours)}</td>
                    <td className="px-4 py-3 text-stone-500">{entry.note || "—"}</td>
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
