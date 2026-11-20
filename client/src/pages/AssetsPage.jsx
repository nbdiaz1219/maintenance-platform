import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, getErrorMessage } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import AssetTypeOrganizer from "../components/AssetTypeOrganizer.jsx";
import TravelCases from "../components/TravelCases.jsx";
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

const suggestedTypes = ["Robots", "Raster arms"];

const emptyForm = {
  siteId: "",
  assetType: "Robots",
  name: "",
  description: "",
  serialNumber: "",
  operationalStatus: "OPERATIONAL",
};

function assetTypeName(asset) {
  return (asset.assetType || "Uncategorized").trim() || "Uncategorized";
}

function matchesSearch(asset, query) {
  if (!query) return true;
  const haystack = [
    asset.name,
    asset.serialNumber,
    asset.description,
    asset.assetType,
    asset.site?.name,
    asset.travelCase?.serialNumber,
    asset.travelCase?.name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

export default function AssetsPage() {
  const { isAuthenticated, can } = useAuth();
  const [assets, setAssets] = useState([]);
  const [sites, setSites] = useState([]);
  const [types, setTypes] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [siteFilter, setSiteFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  async function loadData({ quiet = false } = {}) {
    if (!quiet) setLoading(true);
    setError("");
    try {
      const [assetsResponse, sitesResponse, typesResponse, casesResponse] = await Promise.all([
        api.get("/api/assets", { params: { sort: "name" } }),
        api.get("/api/sites"),
        api.get("/api/asset-types"),
        api.get("/api/cases"),
      ]);
      setAssets(assetsResponse.data);
      setSites(sitesResponse.data);
      setTypes(typesResponse.data);
      setCases(casesResponse.data);
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

  function selectSite(siteId) {
    setSiteFilter(siteId);
    setTypeFilter("");
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
      setForm((current) => ({ ...emptyForm, siteId: current.siteId, assetType: current.assetType || "Robots" }));
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

  const loose = useMemo(() => visible.filter((asset) => !asset.caseId), [visible]);

  const groups = useMemo(() => {
    const map = new Map();
    const catalog = types.filter((type) => !siteFilter || type.siteId === siteFilter);
    if (!query && !statusFilter) {
      for (const type of catalog) {
        const current = map.get(type.name);
        if (!current) map.set(type.name, { name: type.name, assets: [], order: type.sortOrder });
        else current.order = Math.min(current.order, type.sortOrder);
      }
    }
    for (const asset of loose) {
      const name = assetTypeName(asset);
      if (!map.has(name)) {
        const orders = catalog.filter((type) => type.name === name).map((type) => type.sortOrder);
        map.set(name, {
          name,
          assets: [],
          order: orders.length ? Math.min(...orders) : name === "Uncategorized" ? 20000 : 10000,
        });
      }
      map.get(name).assets.push(asset);
    }
    for (const group of map.values()) {
      group.assets.sort((a, b) => a.name.localeCompare(b.name));
      if (group.name === "Uncategorized" && group.order >= 10000) group.order = 20000;
    }
    return [...map.values()].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  }, [loose, types, siteFilter, query, statusFilter]);

  const shownGroups = typeFilter ? groups.filter((group) => group.name === typeFilter) : groups;
  const filtersActive = Boolean(search || statusFilter || siteFilter || typeFilter);

  return (
    <div>
      <PageHeader
        title="Assets"
        description="Pack traveling equipment into a case, give that case a serial number, and ship it as one unit. Loose equipment stays grouped by type."
        action={
          !isAuthenticated ? (
            <Link to="/login" className="rounded bg-[#0176d3] px-4 py-2 text-sm font-semibold text-white">
              Sign in to create
            </Link>
          ) : can("assets:write") ? (
            <button
              type="button"
              onClick={() => setShowCreate((open) => !open)}
              className="rounded bg-[#0176d3] px-4 py-2 text-sm font-semibold text-white"
            >
              {showCreate ? "Close" : "Add asset"}
            </button>
          ) : (
            <span className="text-sm text-stone-500">Ops Lead or Operator access required to create</span>
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

      <div className="mb-6 grid gap-4 rounded border border-stone-200 bg-white p-4 shadow-[0_2px_2px_0_rgba(0,0,0,0.1)] md:grid-cols-[1fr_220px_auto] md:items-end">
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-stone-700">Search</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name, type, serial, description, or site"
            className="w-full rounded border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400"
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-stone-700">Site</span>
          <select
            value={siteFilter}
            onChange={(event) => selectSite(event.target.value)}
            className="w-full rounded border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900"
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
              setTypeFilter("");
            }}
            className="rounded border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700"
          >
            Clear
          </button>
        ) : (
          <p className="pb-2 text-sm text-stone-500">{visible.length} shown</p>
        )}
      </div>

      <TravelCases
        cases={cases}
        assets={assets}
        sites={sites}
        siteId={siteFilter}
        canWrite={isAuthenticated && can("assets:write")}
        canDelete={isAuthenticated && can("assets:delete")}
        onChanged={() => loadData({ quiet: true })}
      />

      {isAuthenticated && can("asset-types:manage") ? (
        <AssetTypeOrganizer
          siteId={siteFilter}
          sites={sites}
          types={types}
          usedNames={assets.filter((asset) => asset.siteId === siteFilter).map(assetTypeName)}
          onSiteChange={selectSite}
          onChanged={() => loadData({ quiet: true })}
        />
      ) : null}

      {showCreate && isAuthenticated && can("assets:write") ? (
        <form className="mb-6 grid gap-4 rounded border border-stone-200 bg-white p-6 shadow-[0_2px_2px_0_rgba(0,0,0,0.1)] md:grid-cols-2" onSubmit={handleCreate}>
          <FormField
            label="Site"
            name="siteId"
            as="select"
            value={form.siteId}
            onChange={updateField}
            options={sites.map((site) => ({ value: site.id, label: site.name }))}
            required
          />
          <FormField
            label="Type"
            name="assetType"
            value={form.assetType}
            onChange={updateField}
            list="asset-type-options"
            placeholder="Robots, Raster arms…"
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
          <datalist id="asset-type-options">
            {[...new Set([
              ...types.filter((type) => !form.siteId || type.siteId === form.siteId).map((type) => type.name),
              ...suggestedTypes,
              ...assets.map(assetTypeName),
            ])].map((type) => (
              <option key={type} value={type} />
            ))}
          </datalist>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={submitting || sites.length === 0}
              className="rounded border border-[#c9c9c9] bg-white px-4 py-2 text-sm font-semibold text-[#181818] disabled:opacity-60"
            >
              {submitting ? "Creating..." : "Create asset"}
            </button>
          </div>
        </form>
      ) : null}

      {loading ? <LoadingState /> : null}
      {!loading && visible.length === 0 && groups.length === 0 ? (
        <EmptyState message={filtersActive ? "No assets match these filters." : "No assets yet."} />
      ) : null}

      {!loading && groups.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible" aria-label="Asset types">
            <TypeLink
              label="All types"
              count={loose.length}
              active={!typeFilter}
              onClick={() => setTypeFilter("")}
            />
            {groups.map((group) => (
              <TypeLink
                key={group.name}
                label={group.name}
                count={group.assets.length}
                active={typeFilter === group.name}
                onClick={() => setTypeFilter(group.name)}
              />
            ))}
          </nav>
          <div className="space-y-8">
            {shownGroups.map((group) => (
              <section key={group.name}>
                <h3 className="mb-3 text-xl font-semibold text-stone-900">{group.name}</h3>
                {group.assets.length === 0 ? (
                  <p className="rounded border border-dashed border-stone-200 px-5 py-4 text-sm text-stone-500">
                    No assets in this type yet.
                  </p>
                ) : null}
                {group.assets.length > 0 ? (
                <ul className="divide-y divide-stone-200 overflow-hidden rounded border border-stone-200 bg-white">
                  {group.assets.map((asset) => (
                    <li key={asset.id}>
                      <Link
                        to={`/assets/${asset.id}`}
                        className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-stone-50"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold text-stone-900">{asset.name}</p>
                          <p className="mt-1 truncate text-sm text-stone-500">
                            {[asset.site?.name, asset.serialNumber].filter(Boolean).join(" · ") || "No site"}
                          </p>
                        </div>
                        <StatusBadge value={asset.operationalStatus} />
                      </Link>
                    </li>
                  ))}
                </ul>
                ) : null}
              </section>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TypeLink({ label, count, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 items-center justify-between gap-3 rounded px-4 py-3 text-left text-sm font-semibold lg:w-full ${
        active ? "bg-[#0176d3] text-white" : "bg-white text-stone-900 ring-1 ring-inset ring-stone-200"
      }`}
    >
      <span>{label}</span>
      <span className={active ? "text-white/80" : "text-stone-500"}>{count}</span>
    </button>
  );
}

function FilterChip({ label, count, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset ${
        active
          ? "bg-[#0176d3] text-white ring-[#0176d3]"
          : "bg-white text-stone-700 ring-stone-200 hover:bg-stone-100"
      }`}
    >
      {label}
      <span className={active ? "ml-1.5 text-white/80" : "ml-1.5 text-stone-500"}>{count}</span>
    </button>
  );
}
