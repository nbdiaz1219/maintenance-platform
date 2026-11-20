import { useState } from "react";
import { api, getErrorMessage } from "../api/client.js";

const starterTypes = ["Robots", "Raster arms"];

export default function AssetTypeOrganizer({ siteId, sites, types, usedNames, onSiteChange, onChanged }) {
  const [draft, setDraft] = useState("");
  const [names, setNames] = useState({});
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  const siteTypes = types
    .filter((type) => type.siteId === siteId)
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  const catalogNames = new Set(siteTypes.map((type) => type.name.toLowerCase()));
  const missing = [...new Set([...(usedNames || []), ...starterTypes])].filter(
    (name) => name && name.toLowerCase() !== "uncategorized" && !catalogNames.has(name.toLowerCase()),
  );

  async function run(id, action) {
    setBusyId(id || "new");
    setError("");
    try {
      await action();
      setDraft("");
      await onChanged();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to update types"));
    } finally {
      setBusyId("");
    }
  }

  async function addType(name) {
    const trimmed = name.trim();
    if (!trimmed || !siteId) return;
    await run("new", () => api.post("/api/asset-types", { siteId, name: trimmed }));
  }

  async function rename(type) {
    const next = (names[type.id] ?? type.name).trim();
    if (!next || next === type.name) return;
    await run(type.id, () => api.patch(`/api/asset-types/${type.id}`, { name: next }));
  }

  async function move(type, direction) {
    const index = siteTypes.findIndex((item) => item.id === type.id);
    const target = index + direction;
    if (target < 0 || target >= siteTypes.length) return;
    const ordered = siteTypes.map((item) => item.id);
    const [moved] = ordered.splice(index, 1);
    ordered.splice(target, 0, moved);
    await run(type.id, () => api.patch("/api/asset-types/reorder", { siteId, orderedIds: ordered }));
  }

  async function remove(type) {
    let reassignTo;
    if (type.assetCount > 0) {
      const fallback = siteTypes.find((item) => item.id !== type.id)?.name || "Uncategorized";
      const answer = window.prompt(
        `${type.name} is on ${type.assetCount} asset${type.assetCount === 1 ? "" : "s"}. Move them to which type?`,
        fallback,
      );
      if (!answer || !answer.trim()) return;
      reassignTo = answer.trim();
    }
    await run(type.id, () => api.delete(`/api/asset-types/${type.id}`, { data: reassignTo ? { reassignTo } : {} }));
  }

  return (
    <section className="mb-6 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-stone-900">Organize types</h2>
          <p className="mt-1 text-sm text-stone-500">
            Admins and ops leads set the type list for a site. Operators can still pick a type on an asset.
          </p>
        </div>
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-stone-700">Site</span>
          <select
            value={siteId}
            onChange={(event) => onSiteChange(event.target.value)}
            className="min-w-48 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900"
          >
            <option value="">Choose a site</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>{site.name}</option>
            ))}
          </select>
        </label>
      </div>

      {error ? <p className="mb-3 text-sm text-red-300">{error}</p> : null}

      {!siteId ? (
        <p className="text-sm text-stone-500">Choose a site to add, rename, reorder, or remove its types.</p>
      ) : (
        <>
          <ul className="divide-y divide-stone-200 overflow-hidden rounded-2xl border border-stone-200">
            {siteTypes.length === 0 ? (
              <li className="px-4 py-3 text-sm text-stone-500">No types yet for this site.</li>
            ) : null}
            {siteTypes.map((type, index) => (
              <li key={type.id} className="flex flex-wrap items-center gap-2 px-3 py-3">
                <input
                  value={names[type.id] ?? type.name}
                  onChange={(event) => setNames((current) => ({ ...current, [type.id]: event.target.value }))}
                  aria-label={`Type name for ${type.name}`}
                  className="min-w-40 flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900"
                />
                <span className="text-xs text-stone-500">{type.assetCount} assets</span>
                <button type="button" disabled={busyId === type.id} onClick={() => rename(type)} className="rounded-lg px-2 py-1 text-sm font-medium text-stone-900 hover:bg-stone-100">
                  Rename
                </button>
                <button type="button" disabled={index === 0 || Boolean(busyId)} onClick={() => move(type, -1)} className="rounded-lg px-2 py-1 text-sm text-stone-700 hover:bg-stone-100 disabled:opacity-40">
                  Up
                </button>
                <button type="button" disabled={index === siteTypes.length - 1 || Boolean(busyId)} onClick={() => move(type, 1)} className="rounded-lg px-2 py-1 text-sm text-stone-700 hover:bg-stone-100 disabled:opacity-40">
                  Down
                </button>
                <button type="button" disabled={Boolean(busyId)} onClick={() => remove(type)} className="rounded-lg px-2 py-1 text-sm text-red-300 hover:bg-stone-100">
                  Remove
                </button>
              </li>
            ))}
          </ul>

          <form
            className="mt-4 flex flex-wrap gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              addType(draft);
            }}
          >
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="New type, such as Crawlers"
              aria-label="New asset type"
              className="min-w-48 flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400"
            />
            <button type="submit" disabled={!draft.trim() || Boolean(busyId)} className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              Add type
            </button>
          </form>

          {missing.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-sm text-stone-500">Add to this site:</span>
              {missing.map((name) => (
                <button
                  key={name}
                  type="button"
                  disabled={Boolean(busyId)}
                  onClick={() => addType(name)}
                  className="rounded-full bg-white px-3 py-1 text-sm text-stone-900 ring-1 ring-inset ring-stone-200 hover:bg-stone-100"
                >
                  {name}
                </button>
              ))}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
