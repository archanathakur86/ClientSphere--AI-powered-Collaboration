import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../api/axios.js";

const STATUS = {
  pending: { label: "Not submitted", dot: "bg-slate-500", chip: "bg-slate-500/10 text-slate-300 border-slate-500/30" },
  "in review": { label: "Waiting for client", dot: "bg-amber-400", chip: "bg-amber-500/10 text-amber-300 border-amber-500/30" },
  "changes requested": { label: "Changes requested", dot: "bg-orange-400", chip: "bg-orange-500/10 text-orange-300 border-orange-500/30" },
  approved: { label: "Approved", dot: "bg-emerald-400", chip: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" },
};

const money = (n) => {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(Number(n || 0));
  } catch {
    return `$${Number(n || 0).toFixed(2)}`;
  }
};
const fmt = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "");
const toInputDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");
const emptyForm = { title: "", description: "", dueDate: "", amount: "" };

const Chip = ({ status }) => {
  const meta = STATUS[status] || STATUS.pending;
  return <span className={`text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full border whitespace-nowrap ${meta.chip}`}>{meta.label}</span>;
};

function MilestoneForm({ initial, submitLabel, saving, onSubmit, onCancel }) {
  const [form, setForm] = useState(initial);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Give the milestone a title");
    if (form.amount !== "" && (Number.isNaN(Number(form.amount)) || Number(form.amount) < 0)) return toast.error("Amount must be 0 or more");
    onSubmit({ title: form.title.trim(), description: form.description, dueDate: form.dueDate || null, amount: form.amount === "" ? 0 : Number(form.amount) });
  };

  return (
    <form onSubmit={submit} className="card space-y-3 border-indigo-500/30">
      <input className="input" placeholder="Milestone title, e.g. Homepage design" value={form.title} onChange={set("title")} autoFocus />
      <textarea className="input" rows={2} placeholder="What will the client receive? (this is what scope-creep checks compare against)" value={form.description} onChange={set("description")} />
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-slate-400 space-y-1">
          <span>Due date</span>
          <input type="date" className="input" value={form.dueDate} onChange={set("dueDate")} />
        </label>
        <label className="text-xs text-slate-400 space-y-1">
          <span>Amount (USD)</span>
          <input type="number" min="0" step="0.01" className="input" placeholder="0.00" value={form.amount} onChange={set("amount")} />
        </label>
      </div>
      <div className="flex gap-2">
        <button className="btn btn-primary text-sm" disabled={saving}>{saving ? "Saving…" : submitLabel}</button>
        <button type="button" className="btn btn-secondary text-sm" onClick={onCancel} disabled={saving}>Cancel</button>
      </div>
    </form>
  );
}

export default function MilestonesTab({ projectId, project, canEdit, onChanged, onGoToClient, refreshKey = 0 }) {
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/projects/${projectId}/milestones`);
      setMilestones(res.data.milestones || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't load milestones");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const changed = async () => {
    await load();
    onChanged?.();
  };

  const create = async (values) => {
    setSaving(true);
    try {
      await api.post(`/projects/${projectId}/milestones`, values);
      toast.success("Milestone added");
      setAdding(false);
      await changed();
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't add the milestone");
    } finally {
      setSaving(false);
    }
  };

  const update = async (id, values, successMessage = "Milestone updated") => {
    setBusyId(id);
    try {
      await api.patch(`/projects/${projectId}/milestones/${id}`, values);
      toast.success(successMessage);
      setEditingId(null);
      await changed();
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't update the milestone");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (milestone) => {
    if (!window.confirm(`Delete "${milestone.title}"? This can't be undone.`)) return;
    setBusyId(milestone._id);
    try {
      await api.delete(`/projects/${projectId}/milestones/${milestone._id}`);
      toast.success("Milestone deleted");
      await changed();
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't delete the milestone");
    } finally {
      setBusyId(null);
    }
  };

  const submitForReview = (milestone) => {
    if (!project?.clientEmail && !window.confirm("No client has been invited yet, so nobody can review this. Submit anyway?")) return;
    update(milestone._id, { status: "in review" }, "Submitted. The client has been notified.");
  };

  if (loading) return <div className="text-slate-400 text-sm">Loading milestones…</div>;

  const now = new Date();
  const total = milestones.length;
  const approved = milestones.filter((m) => m.status === "approved");
  const inReview = milestones.filter((m) => m.status === "in review").length;
  const totalValue = milestones.reduce((s, m) => s + Number(m.amount || 0), 0);
  const approvedValue = approved.reduce((s, m) => s + Number(m.amount || 0), 0);
  const percent = total ? Math.round((approved.length / total) * 100) : 0;
  const ordered = [...milestones].sort((a, b) => {
    const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
    const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
    return da - db;
  });

  return (
    <div className="space-y-5">
      {!project?.clientEmail && (
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-200 flex flex-wrap items-center justify-between gap-3">
          <span>No client is connected yet. Invite them so they can review and approve milestones.</span>
          {onGoToClient && <button onClick={onGoToClient} className="btn btn-secondary text-xs py-1.5">Invite client</button>}
        </div>
      )}

      <div className="card">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-400">Delivery progress</div>
            <div className="text-2xl font-bold mt-1">
              {approved.length} of {total} approved
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {money(approvedValue)} approved of {money(totalValue)}
              {inReview > 0 ? ` · ${inReview} waiting for the client` : ""}
            </div>
          </div>
          {canEdit && !adding && (
            <button className="btn btn-primary text-sm" onClick={() => { setAdding(true); setEditingId(null); }}>
              + Add milestone
            </button>
          )}
        </div>
        <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden mt-4">
          <div className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all" style={{ width: `${percent}%` }} />
        </div>
      </div>

      {adding && <MilestoneForm initial={emptyForm} submitLabel="Add milestone" saving={saving} onSubmit={create} onCancel={() => setAdding(false)} />}

      {total === 0 && !adding ? (
        <div className="card text-center py-10 text-slate-400 space-y-2">
          <div className="text-white font-semibold">Break the project into milestones</div>
          <p className="text-sm">Each milestone has a due date and a price. When you submit one, your client reviews and approves it, and an invoice is drafted automatically.</p>
          {canEdit && <button className="btn btn-primary text-sm mt-2" onClick={() => setAdding(true)}>Add your first milestone</button>}
        </div>
      ) : (
        <ol className="relative space-y-4 border-l border-slate-800 ml-2 pl-6">
          {ordered.map((m) => {
            const meta = STATUS[m.status] || STATUS.pending;
            const overdue = m.status !== "approved" && m.dueDate && new Date(m.dueDate) < now;
            const editable = canEdit && ["pending", "changes requested"].includes(m.status);
            const latestChange = (m.changeRequests || []).slice(-1)[0];
            const busy = busyId === m._id;

            if (editingId === m._id) {
              return (
                <li key={m._id}>
                  <MilestoneForm
                    initial={{ title: m.title, description: m.description || "", dueDate: toInputDate(m.dueDate), amount: m.amount ?? "" }}
                    submitLabel="Save changes"
                    saving={busy}
                    onSubmit={(values) => update(m._id, values)}
                    onCancel={() => setEditingId(null)}
                  />
                </li>
              );
            }

            return (
              <li key={m._id} className="relative">
                <span className={`absolute -left-[31px] top-5 w-3 h-3 rounded-full ring-4 ring-slate-950 ${meta.dot}`} />
                <div className="card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-white">{m.title}</div>
                      {m.description && <div className="text-sm text-slate-400 mt-1 whitespace-pre-wrap">{m.description}</div>}
                    </div>
                    <Chip status={m.status} />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 mt-3 text-xs">
                    <span className={overdue ? "text-red-300 font-medium" : "text-slate-400"}>
                      {m.dueDate ? `${overdue ? "Overdue · " : "Due "}${fmt(m.dueDate)}` : "No due date"}
                    </span>
                    <span className="text-slate-200 font-medium">{money(m.amount)}</span>
                  </div>

                  {m.status === "changes requested" && latestChange && (
                    <div className="mt-3 rounded-lg border border-orange-500/30 bg-orange-500/10 p-3 text-sm text-orange-100">
                      <div className="text-[11px] uppercase tracking-wide text-orange-300 font-semibold mb-1">Client asked for changes{latestChange.createdAt ? ` · ${fmt(latestChange.createdAt)}` : ""}</div>
                      {latestChange.comment}
                    </div>
                  )}
                  {m.status === "approved" && (
                    <div className="mt-3 text-xs text-emerald-300">Approved{m.approvedAt ? ` on ${fmt(m.approvedAt)}` : ""}. A draft invoice was created in the Invoices tab.</div>
                  )}

                  {canEdit && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {(m.status === "pending" || m.status === "changes requested") && (
                        <button className="btn btn-primary text-xs py-1.5" disabled={busy} onClick={() => submitForReview(m)}>
                          {busy ? "Submitting…" : m.status === "changes requested" ? "Resubmit for review" : "Submit for client review"}
                        </button>
                      )}
                      {m.status === "in review" && (
                        <button className="btn btn-secondary text-xs py-1.5" disabled={busy} onClick={() => update(m._id, { status: "pending" }, "Withdrawn from review")}>
                          Withdraw from review
                        </button>
                      )}
                      {editable && (
                        <button className="btn btn-secondary text-xs py-1.5" disabled={busy} onClick={() => { setEditingId(m._id); setAdding(false); }}>
                          Edit
                        </button>
                      )}
                      {editable && (
                        <button className="btn btn-secondary text-xs py-1.5 text-red-300 hover:text-red-200" disabled={busy} onClick={() => remove(m)}>
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}