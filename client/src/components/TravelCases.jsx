import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, getErrorMessage } from "../api/client.js";
import { statusLabel } from "../utils/labels.js";
import StatusBadge from "./StatusBadge.jsx";

const caseStatuses = [
  { value: "OPERATIONAL", label: "Operational" },
  { value: "DEGRADED", label: "Degraded" },
  { value: "OFFLINE", label: "Offline" },
  { value: "DECOMMISSIONED", label: "Decommissioned" },
];

const starterTypes = ["Robots", "Raster arms"];

export default function TravelCases({
  cases,
  assets,
  sites,
  siteId,
  typeNames = [],
  canWrite,
  canDelete,
  onChanged,
  showForm = false,
  onShowForm,
}) {
  const [serialNumber, setSerialNumber] = useState("");
  const [name, setName] = useState("");
  const [createSiteId, setCreateSiteId] = useState(siteId || "");

  useEffect(() => {
    if (siteId) setCreateSiteId(siteId);
  }, [siteId]);
  const [openId, setOpenId] = useState("");
  const [names, setNames] = useState({});
  const [component, setComponent] = useState({});
  const [packed, setPacked] = useState({});
  const [destination, setDestination] = useState({});
  const [statusMenuId, setStatusMenuId] = useState("");
  const [pendingStatus, setPendingStatus] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const componentTypes = [...new Set([...starterTypes, ...typeNames])];

  const visibleCases = cases
    .filter((item) => !siteId || item.siteId === siteId)
    .slice()
    .sort((a, b) => a.serialNumber.localeCompare(b.serialNumber));

  async function run(id, action) {
    setBusy(id || "new");
    setError("");
    try {
      await action();
      await onChanged();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to update the case"));
    } finally {
      setBusy("");
    }
  }

  async function createCase(event) {
    event.preventDefault();
    const chosenSite = createSiteId || siteId;
    if (!chosenSite || !name.trim() || !serialNumber.trim()) return;
    await run("new", async () => {
      await api.post("/api/cases", {
        siteId: chosenSite,
        serialNumber: serialNumber.trim(),
        name: name.trim(),
      });
      setSerialNumber("");
      setName("");
      onShowForm?.(false);
    });
  }

  function selectionFor(travelCase) {
    if (packed[travelCase.id]) return packed[travelCase.id];
    return new Set(travelCase.assets.map((asset) => asset.id));
  }

  function toggleAsset(travelCase, assetId) {
    const next = new Set(selectionFor(travelCase));
    if (next.has(assetId)) next.delete(assetId);
    else next.add(assetId);
    setPacked((current) => ({ ...current, [travelCase.id]: next }));
  }

  return (
    <section id="travel-cases" className="mb-6 rounded border border-[#e5e5e5] bg-white p-4 shadow-[0_2px_2px_0_rgba(0,0,0,0.1)]">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#181818]">Travel cases</h2>
          <p className="mt-1 text-[13px] text-[#444444]">
            Name a case, give it a serial number, then add the components that ship inside it.
          </p>
        </div>
        {canWrite ? (
          <button
            type="button"
            onClick={() => onShowForm?.(!showForm)}
            className="rounded bg-[#0176d3] px-4 py-2 text-sm font-bold text-white"
          >
            {showForm ? "Close" : "Create a case"}
          </button>
        ) : null}
      </div>
      {error ? <p className="mb-3 text-[13px] text-[#8e030f]">{error}</p> : null}

      {canWrite && showForm ? (
        <form className="mb-4 flex flex-wrap items-end gap-2 rounded border border-[#e5e5e5] bg-[#f3f3f3] p-3" onSubmit={createCase}>
          <label className="grid gap-1 text-[12px] font-bold text-[#444444]">
            Site
            <select
              value={createSiteId || siteId}
              onChange={(event) => setCreateSiteId(event.target.value)}
              required
              aria-label="Case site"
              className="rounded border border-[#c9c9c9] bg-white px-3 py-1.5 text-sm font-normal text-[#181818]"
            >
              <option value="">Choose a site</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>{site.name}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-[12px] font-bold text-[#444444]">
            Case name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Spot travel kit"
              required
              aria-label="Case name"
              className="rounded border border-[#c9c9c9] bg-white px-3 py-1.5 text-sm font-normal text-[#181818]"
            />
          </label>
          <label className="grid gap-1 text-[12px] font-bold text-[#444444]">
            Case serial
            <input
              value={serialNumber}
              onChange={(event) => setSerialNumber(event.target.value)}
              required
              aria-label="Case serial number"
              className="rounded border border-[#c9c9c9] bg-white px-3 py-1.5 text-sm font-normal text-[#181818]"
            />
          </label>
          <button
            type="submit"
            disabled={busy === "new" || sites.length === 0}
            className="rounded bg-[#0176d3] px-3 py-2 text-[13px] font-bold text-white disabled:opacity-60"
          >
            Create a case
          </button>
        </form>
      ) : null}

      {visibleCases.length === 0 ? (
        <p className="text-[13px] text-[#444444]">No cases at this site. Loose equipment stays in the type list.</p>
      ) : (
        <ul className="divide-y divide-[#e5e5e5] rounded border border-[#e5e5e5]">
          {visibleCases.map((travelCase) => {
            const open = openId === travelCase.id;
            const siteAssets = assets.filter((asset) => asset.siteId === travelCase.siteId);
            const selected = selectionFor(travelCase);
            const otherSites = sites.filter((site) => site.id !== travelCase.siteId);
            return (
              <li key={travelCase.id} className="bg-white">
                <div className="flex w-full items-center justify-between gap-3 px-4 py-3 hover:bg-[#f3f3f3]">
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? "" : travelCase.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block text-sm font-bold text-[#0176d3]">{travelCase.name}</span>
                    <span className="block text-[13px] text-[#444444]">
                      {travelCase.serialNumber} · {travelCase.site?.name} · {travelCase.assets.length} components
                    </span>
                  </button>
                  <span className="flex shrink-0 items-center gap-3">
                    <CaseStatusControl
                      travelCase={travelCase}
                      canWrite={canWrite}
                      busy={Boolean(busy)}
                      open={statusMenuId === travelCase.id}
                      onToggle={() => {
                        setPendingStatus(null);
                        setStatusMenuId((current) => (current === travelCase.id ? "" : travelCase.id));
                      }}
                      onClose={() => setStatusMenuId("")}
                      onChoose={(status) => {
                        setStatusMenuId("");
                        const current = travelCase.operationalStatus || "OPERATIONAL";
                        if (status.value === current) return;
                        setPendingStatus({
                          id: travelCase.id,
                          name: travelCase.name,
                          serialNumber: travelCase.serialNumber,
                          value: status.value,
                          label: status.label,
                        });
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setOpenId(open ? "" : travelCase.id)}
                      className="text-[12px] font-bold text-[#706e6b]"
                    >
                      {open ? "Hide" : "Open"}
                    </button>
                  </span>
                </div>
                {open ? (
                  <div className="border-t border-[#e5e5e5] px-4 py-3">
                    <h3 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-[#706e6b]">Components</h3>
                    {travelCase.assets.length === 0 ? (
                      <p className="mb-3 text-[13px] text-[#444444]">No components in this case yet.</p>
                    ) : (
                      <ul className="mb-3 space-y-1">
                        {travelCase.assets.map((asset) => (
                          <li key={asset.id} className="text-[13px]">
                            <Link className="font-bold text-[#0176d3] hover:underline" to={`/assets/${asset.id}`}>
                              {asset.name}
                            </Link>
                            <span className="text-[#444444]">
                              {" "}
                              · {asset.assetType}
                              {asset.serialNumber ? ` · ${asset.serialNumber}` : ""}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {canWrite ? (
                      <div className="grid gap-3 border-t border-[#e5e5e5] pt-3">
                        <form
                          className="flex flex-wrap items-end gap-2"
                          onSubmit={(event) => {
                            event.preventDefault();
                            const nextName = (names[travelCase.id] ?? travelCase.name).trim();
                            if (!nextName) return;
                            run(travelCase.id, () => api.patch(`/api/cases/${travelCase.id}`, { name: nextName }));
                          }}
                        >
                          <label className="grid min-w-48 flex-1 gap-1 text-[12px] font-bold text-[#444444]">
                            Case name
                            <input
                              value={names[travelCase.id] ?? travelCase.name}
                              onChange={(event) =>
                                setNames((current) => ({ ...current, [travelCase.id]: event.target.value }))
                              }
                              aria-label={`Name for ${travelCase.serialNumber}`}
                              className="rounded border border-[#c9c9c9] px-3 py-1.5 text-sm font-normal text-[#181818]"
                            />
                          </label>
                          <button
                            type="submit"
                            disabled={Boolean(busy)}
                            className="rounded border border-[#c9c9c9] bg-white px-3 py-2 text-[13px] font-bold text-[#181818] hover:bg-[#f3f3f3]"
                          >
                            Save name
                          </button>
                        </form>

                        <form
                          className="flex flex-wrap items-end gap-2"
                          onSubmit={(event) => {
                            event.preventDefault();
                            const draft = component[travelCase.id] || {};
                            if (!draft.name?.trim() || !draft.assetType?.trim()) return;
                            run(`${travelCase.id}-component`, async () => {
                              await api.post(`/api/cases/${travelCase.id}/components`, {
                                name: draft.name.trim(),
                                assetType: draft.assetType.trim(),
                                serialNumber: draft.serialNumber?.trim() || undefined,
                              });
                              setComponent((current) => ({ ...current, [travelCase.id]: { assetType: draft.assetType } }));
                            });
                          }}
                        >
                          <label className="grid min-w-36 flex-1 gap-1 text-[12px] font-bold text-[#444444]">
                            Component
                            <input
                              value={component[travelCase.id]?.name || ""}
                              onChange={(event) =>
                                setComponent((current) => ({
                                  ...current,
                                  [travelCase.id]: { ...current[travelCase.id], name: event.target.value },
                                }))
                              }
                              placeholder="Spot"
                              required
                              aria-label={`Component name for ${travelCase.name}`}
                              className="rounded border border-[#c9c9c9] px-3 py-1.5 text-sm font-normal text-[#181818]"
                            />
                          </label>
                          <label className="grid min-w-32 gap-1 text-[12px] font-bold text-[#444444]">
                            Type
                            <input
                              value={component[travelCase.id]?.assetType || ""}
                              onChange={(event) =>
                                setComponent((current) => ({
                                  ...current,
                                  [travelCase.id]: { ...current[travelCase.id], assetType: event.target.value },
                                }))
                              }
                              list={`case-types-${travelCase.id}`}
                              placeholder="Robots"
                              required
                              aria-label={`Component type for ${travelCase.name}`}
                              className="rounded border border-[#c9c9c9] px-3 py-1.5 text-sm font-normal text-[#181818]"
                            />
                          </label>
                          <datalist id={`case-types-${travelCase.id}`}>
                            {componentTypes.map((type) => (
                              <option key={type} value={type} />
                            ))}
                          </datalist>
                          <label className="grid min-w-28 gap-1 text-[12px] font-bold text-[#444444]">
                            Serial
                            <input
                              value={component[travelCase.id]?.serialNumber || ""}
                              onChange={(event) =>
                                setComponent((current) => ({
                                  ...current,
                                  [travelCase.id]: { ...current[travelCase.id], serialNumber: event.target.value },
                                }))
                              }
                              aria-label={`Component serial for ${travelCase.name}`}
                              className="rounded border border-[#c9c9c9] px-3 py-1.5 text-sm font-normal text-[#181818]"
                            />
                          </label>
                          <button
                            type="submit"
                            disabled={Boolean(busy)}
                            className="rounded bg-[#0176d3] px-3 py-2 text-[13px] font-bold text-white disabled:opacity-60"
                          >
                            Add component
                          </button>
                        </form>

                        <fieldset>
                          <legend className="text-[12px] font-bold text-[#444444]">Pack equipment from this site</legend>
                          <div className="mt-2 max-h-40 space-y-1 overflow-auto">
                            {siteAssets.length === 0 ? (
                              <p className="text-[13px] text-[#444444]">No equipment at this site.</p>
                            ) : (
                              siteAssets.map((asset) => (
                                <label key={asset.id} className="flex items-center gap-2 text-[13px] text-[#181818]">
                                  <input
                                    type="checkbox"
                                    checked={selected.has(asset.id)}
                                    onChange={() => toggleAsset(travelCase, asset.id)}
                                  />
                                  <span>
                                    {asset.name}
                                    {asset.travelCase && asset.travelCase.id !== travelCase.id
                                      ? ` (in ${asset.travelCase.serialNumber})`
                                      : ""}
                                  </span>
                                </label>
                              ))
                            )}
                          </div>
                          <button
                            type="button"
                            disabled={Boolean(busy)}
                            onClick={() =>
                              run(travelCase.id, () =>
                                api.patch(`/api/cases/${travelCase.id}`, { assetIds: [...selected] }),
                              )
                            }
                            className="mt-2 rounded border border-[#c9c9c9] bg-white px-3 py-1.5 text-[13px] font-bold text-[#181818] hover:bg-[#f3f3f3]"
                          >
                            Save packing
                          </button>
                        </fieldset>

                        <form
                          className="flex flex-wrap items-end gap-2"
                          onSubmit={(event) => {
                            event.preventDefault();
                            const site = destination[travelCase.id];
                            if (!site) return;
                            run(travelCase.id, () => api.post(`/api/cases/${travelCase.id}/ship`, { siteId: site }));
                          }}
                        >
                          <label className="grid gap-1 text-[12px] font-bold text-[#444444]">
                            Ship case to
                            <select
                              value={destination[travelCase.id] || ""}
                              onChange={(event) =>
                                setDestination((current) => ({ ...current, [travelCase.id]: event.target.value }))
                              }
                              aria-label={`Ship ${travelCase.serialNumber} to`}
                              className="rounded border border-[#c9c9c9] bg-white px-2 py-1.5 text-sm font-normal"
                            >
                              <option value="">Choose a site</option>
                              {otherSites.map((site) => (
                                <option key={site.id} value={site.id}>{site.name}</option>
                              ))}
                            </select>
                          </label>
                          <button
                            type="submit"
                            disabled={!destination[travelCase.id] || Boolean(busy)}
                            className="rounded bg-[#0176d3] px-3 py-2 text-[13px] font-bold text-white disabled:opacity-60"
                          >
                            Ship as one case
                          </button>
                          {canDelete ? (
                            <button
                              type="button"
                              disabled={Boolean(busy)}
                              onClick={() => {
                                if (!window.confirm(`Remove case ${travelCase.serialNumber}? Equipment stays at this site.`)) return;
                                run(travelCase.id, () => api.delete(`/api/cases/${travelCase.id}`));
                              }}
                              className="rounded border border-[#c9c9c9] px-3 py-2 text-[13px] text-[#8e030f]"
                            >
                              Remove case
                            </button>
                          ) : null}
                        </form>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      {pendingStatus ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="case-status-title"
            className="w-full max-w-md rounded border border-[#e5e5e5] bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.16)]"
          >
            <h3 id="case-status-title" className="text-base font-bold text-[#181818]">Change case status?</h3>
            <p className="mt-2 text-sm text-[#444444]">
              Mark {pendingStatus.name} ({pendingStatus.serialNumber}) as {pendingStatus.label}. Every component
              packed in this case will be marked {pendingStatus.label} too.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingStatus(null)}
                className="rounded border border-[#c9c9c9] bg-white px-4 py-2 text-sm font-bold text-[#181818] hover:bg-[#f3f3f3]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const choice = pendingStatus;
                  setPendingStatus(null);
                  run(choice.id, () => api.patch(`/api/cases/${choice.id}`, { operationalStatus: choice.value }));
                }}
                className="rounded bg-[#0176d3] px-4 py-2 text-sm font-bold text-white"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function CaseStatusControl({ travelCase, canWrite, busy, open, onToggle, onClose, onChoose }) {
  const current = travelCase.operationalStatus || "OPERATIONAL";
  if (!canWrite) {
    return <StatusBadge value={current} />;
  }
  return (
    <span className="relative">
      <button
        type="button"
        disabled={busy}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Change status for ${travelCase.name}, currently ${statusLabel(current)}`}
        title="Change status"
        onClick={onToggle}
        className="rounded focus:outline-none focus:ring-2 focus:ring-[#0176d3] disabled:opacity-60"
      >
        <StatusBadge value={current} />
      </button>
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-20 cursor-default"
            aria-label="Close status menu"
            onClick={onClose}
          />
          <ul
            role="menu"
            aria-label={`Status for ${travelCase.name}`}
            className="absolute right-0 top-full z-30 mt-1 w-52 overflow-hidden rounded border border-[#e5e5e5] bg-white py-1 text-left shadow-[0_2px_2px_0_rgba(0,0,0,0.1)]"
          >
            {caseStatuses.map((status) => {
              const selected = status.value === current;
              return (
                <li key={status.value} role="none">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => onChoose(status)}
                    className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-[#f3f3f3] ${
                      selected ? "font-bold text-[#0176d3]" : "text-[#181818]"
                    }`}
                  >
                    {status.label}
                    {selected ? <span className="text-[11px] font-bold uppercase text-[#706e6b]">Current</span> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </span>
  );
}
