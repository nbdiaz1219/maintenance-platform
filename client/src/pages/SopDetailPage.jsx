import { Fragment, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, getErrorMessage } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import ErrorBanner from "../components/ErrorBanner.jsx";
import FormField from "../components/FormField.jsx";
import LoadingState from "../components/LoadingState.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { formatDate } from "../utils/labels.js";

function VersionDetail({ version, copied, onCopy }) {
  return (
    <div className="mt-3 space-y-3 rounded border border-stone-200 bg-white/80 p-4 text-sm">
      {version.summary ? <p className="text-stone-600">{version.summary}</p> : null}
      {version.documentUrl ? (
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={version.documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex font-medium text-[#0176d3] hover:underline"
          >
            Open document
          </a>
          <button
            type="button"
            onClick={() => onCopy(version.id, version.documentUrl)}
            className="rounded border border-stone-300 px-2.5 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-50"
          >
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      ) : null}
      {version.content ? (
        <pre className="whitespace-pre-wrap leading-relaxed text-stone-900">{version.content}</pre>
      ) : (
        <p className="text-stone-500">No inline procedure content in this version.</p>
      )}
    </div>
  );
}

export default function SopDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, can } = useAuth();
  const [sop, setSop] = useState(null);
  const [versions, setVersions] = useState([]);
  const [expandedVersionId, setExpandedVersionId] = useState(null);
  const [form, setForm] = useState({
    title: "",
    department: "",
    summary: "",
    content: "",
    documentUrl: "",
    version: "1.0",
    changeNote: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedVersionId, setCopiedVersionId] = useState("");

  async function loadSop() {
    setLoading(true);
    setError("");
    try {
      const [sopResponse, versionsResponse] = await Promise.all([
        api.get(`/api/sops/${id}`),
        api.get(`/api/sops/${id}/versions`),
      ]);
      setSop(sopResponse.data);
      setVersions(versionsResponse.data);
      setForm({
        title: sopResponse.data.title,
        department: sopResponse.data.department,
        summary: sopResponse.data.summary || "",
        content: sopResponse.data.content || "",
        documentUrl: sopResponse.data.documentUrl || "",
        version: sopResponse.data.version || "1.0",
        changeNote: "",
      });
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load SOP"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSop();
  }, [id]);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSave(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await api.patch(`/api/sops/${id}`, {
        title: form.title.trim(),
        department: form.department.trim(),
        summary: form.summary.trim() || null,
        content: form.content.trim() || null,
        documentUrl: form.documentUrl.trim() || null,
        version: form.version.trim() || "1.0",
        changeNote: form.changeNote.trim() || undefined,
      });
      setSop(response.data);
      const versionsResponse = await api.get(`/api/sops/${id}/versions`);
      setVersions(versionsResponse.data);
      setForm((current) => ({ ...current, changeNote: "" }));
    } catch (err) {
      setError(getErrorMessage(err, "Unable to update SOP"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this SOP? This cannot be undone.")) return;
    setSubmitting(true);
    setError("");
    try {
      await api.delete(`/api/sops/${id}`);
      navigate("/sops");
    } catch (err) {
      setError(getErrorMessage(err, "Unable to delete SOP"));
    } finally {
      setSubmitting(false);
    }
  }

  async function copyDocumentLink(url) {
    if (!url) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = url;
        textArea.setAttribute("readonly", "");
        textArea.style.position = "absolute";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 1600);
    } catch {
      setError("Could not copy document link.");
    }
  }

  async function copyVersionDocumentLink(versionId, url) {
    if (!url) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = url;
        textArea.setAttribute("readonly", "");
        textArea.style.position = "absolute";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopiedVersionId(versionId);
      window.setTimeout(() => setCopiedVersionId(""), 1600);
    } catch {
      setError("Could not copy document link.");
    }
  }

  if (loading) return <LoadingState label="Loading SOP..." />;
  if (!sop) {
    return (
      <div>
        <ErrorBanner message={error || "SOP not found."} />
        <Link to="/sops" className="text-sm font-medium text-[#0176d3] hover:underline">
          Back to SOPs
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={sop.title}
        description={`${sop.department} · v${sop.version} · Updated ${formatDate(sop.updatedAt)}`}
        action={
          <Link to="/sops" className="rounded border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700">
            All SOPs
          </Link>
        }
      />

      <ErrorBanner message={error} />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded border border-stone-200 bg-white p-6 shadow-[0_2px_2px_0_rgba(0,0,0,0.1)]">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">Current procedure</h3>
            <span className="rounded-full bg-[#eef4ff] px-2.5 py-1 text-xs font-medium text-[#032d60]">
              v{sop.version}
            </span>
          </div>
          {sop.summary ? <p className="mt-3 text-sm text-stone-600">{sop.summary}</p> : null}
          {sop.documentUrl ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={sop.documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex rounded bg-[#0176d3] px-4 py-2 text-sm font-semibold text-white hover:bg-[#032d60]"
              >
                Open in Google Drive
              </a>
              <button
                type="button"
                onClick={() => copyDocumentLink(sop.documentUrl)}
                className="inline-flex rounded border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
              >
                {copiedLink ? "Copied" : "Copy link"}
              </button>
            </div>
          ) : null}
          {sop.content ? (
            <pre className="mt-4 whitespace-pre-wrap rounded border border-stone-200 bg-white/80 p-4 text-sm leading-relaxed text-stone-900">
              {sop.content}
            </pre>
          ) : !sop.documentUrl ? (
            <p className="mt-4 text-sm text-stone-500">No procedure content has been added yet.</p>
          ) : null}
        </section>

        {isAuthenticated && can("sops:write") ? (
          <form className="space-y-4 rounded border border-stone-200 bg-white p-6 shadow-[0_2px_2px_0_rgba(0,0,0,0.1)]" onSubmit={handleSave}>
            <h3 className="text-lg font-semibold">Edit SOP</h3>
            <p className="text-sm text-stone-500">
              Saving changes archives the current version in history. Bump the version number when you publish
              meaningful updates.
            </p>
            <FormField label="Title" name="title" value={form.title} onChange={updateField} required />
            <FormField label="Department" name="department" value={form.department} onChange={updateField} required />
            <FormField label="Version" name="version" value={form.version} onChange={updateField} />
            <FormField
              label="Change note"
              name="changeNote"
              value={form.changeNote}
              onChange={updateField}
              placeholder="What changed in this revision?"
            />
            <FormField
              label="Document link"
              name="documentUrl"
              type="url"
              value={form.documentUrl}
              onChange={updateField}
              placeholder="https://..."
            />
            <FormField label="Summary" name="summary" value={form.summary} onChange={updateField} />
            <div>
              <label className="text-sm font-medium text-stone-700" htmlFor="content">
                Procedure content
              </label>
              <textarea
                id="content"
                name="content"
                rows={6}
                value={form.content}
                onChange={updateField}
                className="flow-input"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="rounded border border-[#c9c9c9] bg-white px-4 py-2 text-sm font-semibold text-[#181818] disabled:opacity-60"
              >
                {submitting ? "Saving..." : "Save changes"}
              </button>
              {can("sops:delete") ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={submitting}
                  className="rounded border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                >
                  Delete
                </button>
              ) : null}
            </div>
          </form>
        ) : (
          <section className="rounded border border-stone-200 bg-white p-6 shadow-[0_2px_2px_0_rgba(0,0,0,0.1)]">
            <p className="text-sm text-stone-500">
              {!isAuthenticated
                ? "Sign in to edit department SOPs."
                : "Ops Lead access is required to edit SOPs."}
            </p>
            {!isAuthenticated ? (
              <Link to="/login" className="mt-4 inline-flex rounded bg-[#0176d3] px-4 py-2 text-sm font-semibold text-white">
                Sign in
              </Link>
            ) : null}
          </section>
        )}
      </div>

      <section className="mt-6 rounded border border-stone-200 bg-white p-6 shadow-[0_2px_2px_0_rgba(0,0,0,0.1)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">Version history</h3>
          <p className="text-sm text-stone-500">
            First published {formatDate(sop.createdAt)} · {versions.length} archived{" "}
            {versions.length === 1 ? "version" : "versions"}
          </p>
        </div>

        {versions.length === 0 ? (
          <p className="mt-4 text-sm text-stone-500">
            No previous versions yet. The first edit will archive v{sop.version} here.
          </p>
        ) : (
          <div className="mt-4 overflow-hidden rounded border border-stone-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-stone-100/70 text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-4 py-3">Version</th>
                  <th className="px-4 py-3">Archived</th>
                  <th className="px-4 py-3">Published by</th>
                  <th className="px-4 py-3">Change note</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {versions.map((version) => {
                  const isExpanded = expandedVersionId === version.id;
                  return (
                    <Fragment key={version.id}>
                      <tr className="border-t border-stone-200">
                        <td className="px-4 py-3 font-medium">v{version.version}</td>
                        <td className="px-4 py-3 text-stone-600">{formatDate(version.createdAt)}</td>
                        <td className="px-4 py-3 text-stone-600">
                          {version.publishedBy?.name || version.publishedBy?.email || "Unknown"}
                        </td>
                        <td className="px-4 py-3 text-stone-600">{version.changeNote || "—"}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setExpandedVersionId(isExpanded ? null : version.id)}
                            className="text-sm font-medium text-[#0176d3] hover:underline"
                          >
                            {isExpanded ? "Hide" : "View"}
                          </button>
                        </td>
                      </tr>
                      {isExpanded ? (
                        <tr className="border-t border-stone-200 bg-white/50">
                          <td className="px-4 py-4" colSpan={5}>
                            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                              {version.title} · {version.department}
                            </p>
                            <VersionDetail
                              version={version}
                              copied={copiedVersionId === version.id}
                              onCopy={copyVersionDocumentLink}
                            />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
