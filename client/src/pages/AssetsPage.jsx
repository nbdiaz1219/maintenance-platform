import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, getErrorMessage } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import ErrorBanner from "../components/ErrorBanner.jsx";
import FormField from "../components/FormField.jsx";
import LoadingState from "../components/LoadingState.jsx";
import PageHeader, { EmptyState } from "../components/PageHeader.jsx";
import StatusBadge from "../components/StatusBadge.jsx";

const statusOptions = [
  { value: "OPERATIONAL", label: "Operational" },
  { value: "DEGRADED", label: "Degraded" },
  { value: "OFFLINE", label: "Offline" },
  { value: "DECOMMISSIONED", label: "Decommissioned" },
];

const emptyForm = {
  siteId: "",
  name: "",
  description: "",
  serialNumber: "",
  operationalStatus: "OPERATIONAL",
};

function matchesSearch(asset, query) {
  if (!query) return true;
  const haystack = [asset.name, asset.serialNumber, asset.description, asset.site?.name]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

export default function AssetsPage() {
  const { isAuthenticated, can } = useAuth();
  const [assets, setAssets] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [siteFilter, setSiteFilter] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [assetsResponse, sitesResponse] = await Promise.all([
        api.get("/api/assets", { params: { sort: "name" } }),
        api.get("/api/sites"),
      ]);
      setAssets(assetsResponse.data);
      setSites(sitesResponse.data);
      if (!form.siteId && sitesResponse.data[0]) {
        setForm((current) => ({ ...current, siteId: current.siteId || sitesResponse.data[0].id }));
      }
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load assets"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleCreate(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        ...form,
        description: form.description || undefined,
        serialNumber: form.serialNumber || undefined,
      };
      await api.post("/api/assets", payload);
      setForm((current) => ({ ...emptyForm, siteId: current.siteId }));
      setShowCreate(false);
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to create asset"));
    } finally {
      setSubmitting(false);
    }
  }

  const query = search.trim().toLowerCase();
  const visible = useMemo(
    () =>
      assets.filter((asset) => {
        if (siteFilter && asset.siteId !== siteFilter) return false;
        if (statusFilter && asset.operationalStatus !== statusFilter) return false;
        return matchesSearch(asset, query);
      }),
    [assets, siteFilter, statusFilter, query],
  );

  const counts = useMemo(() => {
    const tally = { all: assets.length, OPERATIONAL: 0, DEGRADED: 0, OFFLINE: 0, DECOMMISSIONED: 0 };
    for (const asset of assets) {
      if (tally[asset.operationalStatus] !== undefined) tally[asset.operationalStatus] += 1;
    }
    return tally;
  }, [assets]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const asset of visible) {
      const key = asset.site?.id || "unassigned";
      if (!map.has(key)) {
        map.set(key, { id: key, name: asset.site?.name || "No site", assets: [] });
      }
      map.get(key).assets.push(asset);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [visible]);

  const filtersActive = Boolean(search || statusFilter || siteFilter);

  return (
    <div>
      <PageHeader
        title="Assets"
        description="Equipment grouped by site. Search by name, serial, description, or site."
        action={
          !isAuthenticated ? (
            <Link to="/login" className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white">
              Sign in to create
            </Link>
          ) : can("assets:write") ? (
            <button
              type="button"
              onClick={() => setShowCreate((open) => !open)}
              className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white"
            >
              {showCreate ? "Close" : "Add asset"}
            </button>
          ) : (
            <span className="text-sm text-slate-400">Ops Lead or Operator access required to create</span>
          )
        }
      />

      <ErrorBanner message={error} />

      <div className="mb-4 flex flex-wrap gap-2">
        <FilterChip label="All" count={counts.all} active={!statusFilter} onClick={() => setStatusFilter("")} />
        {statusOptions.map((option) => (
          <FilterChip
            key={option.value}
            label={option.label}
            count={counts[option.value]}
            active={statusFilter === option.value}
            onClick={() => setStatusFilter((current) => (current === option.value ? "" : option.value))}
          />
        ))}
      </div>

      <div className="mb-6 grid gap-4 rounded-3xl border border-slate-600 bg-slate-800/90 p-4 shadow-sm md:grid-cols-[1fr_220px_auto] md:items-end">
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-200">Search</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name, serial, description, or site"
            className="w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-200">Site</span>
          <select
            value={siteFilter}
            onChange={(event) => setSiteFilter(event.target.value)}
            className="w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">All sites</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>{site.name}</option>
            ))}
          </select>
        </label>
        {filtersActive ? (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatusFilter("");
              setSiteFilter("");
            }}
            className="rounded-xl border border-slate-500 px-4 py-2 text-sm font-medium text-slate-200"
          >
            Clear
          </button>
        ) : (
          <p className="pb-2 text-sm text-slate-400">{visible.length} shown</p>
        )}
      </div>

      {showCreate && isAuthenticated && can("assets:write") ? (
        <form className="mb-6 grid gap-4 rounded-3xl border border-slate-600 bg-slate-800/90 p-6 shadow-sm md:grid-cols-2" onSubmit={handleCreate}>
          <FormField
            label="Site"
            name="siteId"
            as="select"
            value={form.siteId}
            onChange={updateField}
            options={sites.map((site) => ({ value: site.id, label: site.name }))}
            required
          />
          <FormField label="Asset name" name="name" value={form.name} onChange={updateField} required />
          <FormField label="Serial number" name="serialNumber" value={form.serialNumber} onChange={updateField} />
          <FormField
            label="Operational status"
            name="operationalStatus"
            as="select"
            value={form.operationalStatus}
            onChange={updateField}
            options={statusOptions}
          />
          <div className="md:col-span-2">
            <FormField
              label="Description"
              name="description"
              as="textarea"
              value={form.description}
              onChange={updateField}
            />
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={submitting || sites.length === 0}
              className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {submitting ? "Creating..." : "Create asset"}
            </button>
          </div>
        </form>
      ) : null}

      {loading ? <LoadingState /> : null}
      {!loading && visible.length === 0 ? (
        <EmptyState message={filtersActive ? "No assets match these filters." : "No assets yet."} />
      ) : null}

      {!loading && groups.length > 0 ? (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.id}>
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h3 className="text-lg font-semibold text-slate-100">{group.name}</h3>
                <p className="text-sm text-slate-400">
                  {group.assets.length} asset{group.assets.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="overflow-hidden rounded-3xl border border-slate-600 bg-slate-800/90 shadow-sm">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-700/70 text-xs uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Asset</th>
                      <th className="px-4 py-3">Serial</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Work orders</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.assets.map((asset) => (
                      <tr key={asset.id} className="border-t border-slate-700">
                        <td className="px-4 py-3">
                          <Link className="font-medium text-orange-300 hover:underline" to={`/assets/${asset.id}`}>
                            {asset.name}
                          </Link>
                          {asset.description ? (
                            <span className="mt-0.5 block max-w-md truncate text-slate-400">{asset.description}</span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-slate-300">{asset.serialNumber || "—"}</td>
                        <td className="px-4 py-3">
                          <StatusBadge value={asset.operationalStatus} />
                        </td>
                        <td className="px-4 py-3 text-right text-slate-300">{asset._count?.workOrders ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function FilterChip({ label, count, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset ${
        active
          ? "bg-orange-500 text-white ring-orange-400"
          : "bg-slate-800 text-slate-200 ring-slate-600 hover:bg-slate-700"
      }`}
    >
      {label}
      <span className={active ? "ml-1.5 text-orange-100" : "ml-1.5 text-slate-400"}>{count}</span>
    </button>
  );
}
