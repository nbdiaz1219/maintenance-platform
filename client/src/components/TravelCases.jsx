import { useState } from "react";
import { Link } from "react-router-dom";
import { api, getErrorMessage } from "../api/client.js";

const starterTypes = ["Robots", "Raster arms"];

export default function TravelCases({ cases, assets, sites, siteId, typeNames = [], canWrite, canDelete, onChanged }) {
  const [serialNumber, setSerialNumber] = useState("");
  const [name, setName] = useState("");
  const [openId, setOpenId] = useState("");
  const [names, setNames] = useState({});
  const [component, setComponent] = useState({});
  const [packed, setPacked] = useState({});
  const [destination, setDestination] = useState({});
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
    if (!siteId || !serialNumber.trim()) return;
    await run("new", async () => {
      await api.post("/api/cases", {
        siteId,
        serialNumber: serialNumber.trim(),
        name: name.trim(),
      });
      setSerialNumber("");
      setName("");
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
    <section className="mb-6 rounded border border-[#e5e5e5] bg-white p-4 shadow-[0_2px_2px_0_rgba(0,0,0,0.1)]">
      <div className="mb-3">
        <h2 className="text-base font-bold text-[#181818]">Travel cases</h2>
        <p className="mt-1 text-[13px] text-[#444444]">
          Give each case its own serial number, pack the equipment that rides in it, and ship the case as one unit.
        </p>
      </div>
      {error ? <p className="mb-3 text-[13px] text-[#8e030f]">{error}</p> : null}

      {canWrite ? (
        siteId ? (
          <form className="mb-4 flex flex-wrap items-end gap-2" onSubmit={createCase}>
            <label className="grid gap-1 text-[12px] font-bold text-[#444444]">
              Case name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Spot travel kit"
                required
                aria-label="Case name"
                className="rounded border border-[#c9c9c9] px-3 py-1.5 text-sm font-normal text-[#181818]"
              />
            </label>
            <label className="grid gap-1 text-[12px] font-bold text-[#444444]">
              Case serial
              <input
                value={serialNumber}
                onChange={(event) => setSerialNumber(event.target.value)}
                required
                aria-label="Case serial number"
                className="rounded border border-[#c9c9c9] px-3 py-1.5 text-sm font-normal text-[#181818]"
              />
            </label>
            <button
              type="submit"
              disabled={busy === "new"}
              className="rounded bg-[#0176d3] px-3 py-2 text-[13px] font-bold text-white disabled:opacity-60"
            >
              Add case
            </button>
          </form>
        ) : (
          <p className="mb-4 text-[13px] text-[#444444]">Choose a site above to add a case at that location.</p>
        )
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
                <button
                  type="button"
                  onClick={() => setOpenId(open ? "" : travelCase.id)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[#f3f3f3]"
                >
                  <span>
                    <span className="block text-sm font-bold text-[#0176d3]">{travelCase.name}</span>
                    <span className="block text-[13px] text-[#444444]">
                      {travelCase.serialNumber} · {travelCase.site?.name} · {travelCase.assets.length} components
                    </span>
                  </span>
                  <span className="text-[12px] font-bold text-[#706e6b]">{open ? "Hide" : "Open"}</span>
                </button>
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
    </section>
  );
}
