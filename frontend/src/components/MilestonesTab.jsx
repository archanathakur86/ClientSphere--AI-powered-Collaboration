import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../api/axios.js";
import { Check, Clock, Plus, Pencil, Trash2, AlertTriangle, Send, Undo2, MessageSquare, UserPlus } from "lucide-react";

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,400;1,9..144,500&display=swap');

.ms-serif { font-family: 'Fraunces', Georgia, serif; font-weight: 500; letter-spacing: -0.025em; }

@keyframes msIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes msBar { from { transform: scaleX(0); } to { transform: scaleX(var(--p, 0)); } }

.ms-card { animation: msIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) backwards; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
`;

const STATUS = {
  pending: { label: "Not submitted", color: "#a39c92", tint: "#f1ece4", ink: "#6b655e" },
  "in review": { label: "Waiting for client", color: "#e0a46f", tint: "#f7ecc9", ink: "#8a6418" },
  "changes requested": { label: "Changes requested", color: "#c4673f", tint: "#f9e1d6", ink: "#a4502d" },
  approved: { label: "Approved", color: "#3f6e5b", tint: "#dcebe2", ink: "#3f6e5b" },
};
const COLUMNS = ["pending", "in review", "changes requested", "approved"];

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

const inputCls =
  "w-full px-4 py-3 bg-[#ffffff] border border-[#e8e2d9] rounded-2xl text-sm placeholder-[#a39c92] focus:outline-none focus:border-[#c4673f] focus:ring-2 focus:ring-[#f6dccb]";
const labelCls = "block text-[11px] font-semibold uppercase tracking-wider text-[#6b655e] mb-2";

function StatusPill({ status }) {
  const meta = STATUS[status] || STATUS.pending;
  return (
    <span
      className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full whitespace-nowrap"
      style={{ background: meta.tint, color: meta.ink }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
      {meta.label}
    </span>
  );
}

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
    <form onSubmit={submit} className="ms-card rounded-[28px] bg-[#ffffff] border border-[#e8e2d9] p-7 space-y-5 shadow-[0_24px_60px_-40px_rgba(60,40,20,0.35)]">
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-[#c4673f]">{submitLabel}</p>
        <p className="ms-serif text-3xl mt-2">Define the deliverable</p>
      </div>
      <div>
        <label className={labelCls}>Title</label>
        <input className={inputCls} placeholder="e.g. Homepage design" value={form.title} onChange={set("title")} autoFocus />
      </div>
      <div>
        <label className={labelCls}>What the client receives</label>
        <textarea
          className={`${inputCls} resize-none`}
          rows={3}
          placeholder="This is what scope-creep checks compare against."
          value={form.description}
          onChange={set("description")}
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <label>
          <span className={labelCls}>Due date</span>
          <input type="date" className={inputCls} value={form.dueDate} onChange={set("dueDate")} />
        </label>
        <label>
          <span className={labelCls}>Amount (USD)</span>
          <input type="number" min="0" step="0.01" className={inputCls} placeholder="0.00" value={form.amount} onChange={set("amount")} />
        </label>
      </div>
      <div className="flex gap-3 pt-1">
        <button
          disabled={saving}
          className="px-6 py-3 rounded-full bg-[#1c1917] text-[#faf7f2] text-sm font-semibold hover:bg-[#c4673f] transition-colors disabled:opacity-50"
        >
          {saving ? "Saving…" : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-6 py-3 rounded-full border border-[#e8e2d9] text-sm font-semibold hover:border-[#1c1917] transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
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
  const [view, setView] = useState("timeline");

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

  if (loading) {
    return (
      <div className="space-y-5" aria-busy="true">
        <div className="h-44 rounded-[32px] bg-[#f1ece4] animate-pulse" />
        <div className="h-32 rounded-[26px] bg-[#f1ece4] animate-pulse" />
      </div>
    );
  }

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
  const editingMilestone = milestones.find((m) => m._id === editingId);

  const renderActions = (m, busy) => {
    if (!canEdit) return null;
    const editable = ["pending", "changes requested"].includes(m.status);
    const secondary =
      "inline-flex items-center gap-1.5 text-xs font-semibold bg-[#ffffff] border border-[#e8e2d9] text-[#1c1917] px-4 py-2 rounded-full hover:border-[#1c1917] transition-colors disabled:opacity-50";
    return (
      <div className="flex flex-wrap items-center gap-2 mt-5">
        {(m.status === "pending" || m.status === "changes requested") && (
          <button
            disabled={busy}
            onClick={() => submitForReview(m)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#1c1917] text-[#faf7f2] px-4 py-2 rounded-full hover:bg-[#c4673f] transition-colors disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            {busy ? "Submitting…" : m.status === "changes requested" ? "Resubmit" : "Submit for review"}
          </button>
        )}
        {m.status === "in review" && (
          <button disabled={busy} onClick={() => update(m._id, { status: "pending" }, "Withdrawn from review")} className={secondary}>
            <Undo2 className="w-3.5 h-3.5" /> Withdraw
          </button>
        )}
        {editable && (
          <button
            disabled={busy}
            onClick={() => {
              setEditingId(m._id);
              setAdding(false);
            }}
            className={secondary}
          >
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
        )}
        {editable && (
          <button
            disabled={busy}
            onClick={() => remove(m)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#b4475a] px-4 py-2 rounded-full hover:bg-[#f9e1d6] transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        )}
      </div>
    );
  };

  const renderDetails = (m) => {
    const latestChange = (m.changeRequests || []).slice(-1)[0];
    return (
      <>
        {m.status === "changes requested" && latestChange && (
          <div className="mt-5 rounded-2xl bg-[#f9e1d6]/60 border border-[#f2c9b8] p-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#a4502d]">
              <MessageSquare className="w-3.5 h-3.5" />
              Client asked for changes{latestChange.createdAt ? ` · ${fmt(latestChange.createdAt)}` : ""}
            </div>
            <p className="mt-2 text-sm text-[#3a342e] leading-relaxed">{latestChange.comment}</p>
          </div>
        )}
        {m.status === "approved" && (
          <p className="mt-4 text-xs text-[#3f6e5b] font-medium">
            Approved{m.approvedAt ? ` on ${fmt(m.approvedAt)}` : ""}. A draft invoice was created in the Invoices tab.
          </p>
        )}
      </>
    );
  };

  const renderMeta = (m) => {
    const overdue = m.status !== "approved" && m.dueDate && new Date(m.dueDate) < now;
    return (
      <div className="flex flex-wrap items-end justify-between gap-3 mt-4">
        <span
          className={`inline-flex items-center gap-1.5 text-xs ${overdue ? "text-[#b4475a] font-semibold" : "text-[#6b655e]"}`}
        >
          {overdue ? <AlertTriangle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
          {m.dueDate ? `${overdue ? "Overdue · " : "Due "}${fmt(m.dueDate)}` : "No due date"}
        </span>
        <span className="ms-serif text-2xl tabular-nums">{money(m.amount)}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <style>{STYLES}</style>

      {!project?.clientEmail && (
        <div className="rounded-2xl bg-[#f6dccb]/50 border border-[#f2c9b8] px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-3 text-sm text-[#3a342e]">
            <span className="w-8 h-8 rounded-full bg-[#ffffff] flex items-center justify-center shrink-0">
              <UserPlus className="w-4 h-4 text-[#a4502d]" />
            </span>
            No client is connected yet. Invite them so they can review and approve milestones.
          </span>
          {onGoToClient && (
            <button
              onClick={onGoToClient}
              className="text-xs font-semibold bg-[#1c1917] text-[#faf7f2] px-4 py-2 rounded-full hover:bg-[#c4673f] transition-colors"
            >
              Invite client
            </button>
          )}
        </div>
      )}

      {/* Delivery hero */}
      <div className="ms-card rounded-[32px] bg-[#ffffff] border border-[#e8e2d9] p-7 md:p-9 shadow-[0_30px_70px_-45px_rgba(60,40,20,0.35)]">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[#6b655e]">Delivery progress</p>
            <p className="ms-serif text-6xl md:text-7xl mt-3 leading-none tabular-nums">
              {approved.length}
              <span className="text-[#c9c1b5]"> / {total}</span>
            </p>
            <p className="text-sm text-[#6b655e] mt-4">
              {money(approvedValue)} approved of {money(totalValue)} total
              {inReview > 0 ? ` · ${inReview} waiting for the client` : ""}
            </p>
          </div>
          {canEdit && !adding && (
            <button
              onClick={() => {
                setAdding(true);
                setEditingId(null);
              }}
              className="inline-flex items-center gap-2 text-sm font-semibold bg-[#f6dccb] text-[#1c1917] pl-3 pr-5 py-3 rounded-full hover:bg-[#c4673f] hover:text-[#faf7f2] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add milestone
            </button>
          )}
        </div>

        <div className="relative mt-8 h-3 rounded-full bg-[#efe9df] overflow-hidden">
          <div
            className="absolute inset-0 origin-left rounded-full bg-gradient-to-r from-[#3f6e5b] via-[#86b99f] to-[#f6dccb]"
            style={{ "--p": percent / 100, animation: "msBar 1.3s cubic-bezier(0.16,1,0.3,1) both" }}
          />
        </div>
        <div className="mt-2.5 flex justify-between text-[11px] text-[#a39c92]">
          <span>Kickoff</span>
          <span className="font-semibold text-[#1c1917]">{percent}%</span>
        </div>
      </div>

      {adding && (
        <MilestoneForm initial={emptyForm} submitLabel="Add milestone" saving={saving} onSubmit={create} onCancel={() => setAdding(false)} />
      )}

      {total === 0 && !adding ? (
        <div className="ms-card rounded-[32px] border-2 border-dashed border-[#d9d1c4] bg-[#ffffff] p-14 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#dcebe2] flex items-center justify-center">
            <Check className="w-7 h-7 text-[#3f6e5b]" strokeWidth={2.5} />
          </div>
          <h3 className="ms-serif text-4xl mt-7">Break the project into milestones</h3>
          <p className="mt-3 text-sm text-[#6b655e] max-w-lg mx-auto leading-relaxed">
            Each milestone has a due date and a price. When you submit one, your client reviews and approves it, and an invoice is drafted automatically.
          </p>
          {canEdit && (
            <button
              onClick={() => setAdding(true)}
              className="mt-9 px-6 py-3 rounded-full bg-[#1c1917] text-[#faf7f2] text-sm font-semibold hover:bg-[#c4673f] transition-colors"
            >
              Add your first milestone
            </button>
          )}
        </div>
      ) : (
        <>
          {/* View switch */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[#6b655e]">
              {total} milestone{total === 1 ? "" : "s"}
            </p>
            <div className="inline-flex p-1 rounded-full bg-[#f1ece4] border border-[#e8e2d9]">
              {[
                { id: "timeline", label: "Timeline" },
                { id: "board", label: "Board" },
              ].map((v) => (
                <button
                  key={v.id}
                  onClick={() => setView(v.id)}
                  className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                    view === v.id ? "bg-[#1c1917] text-[#faf7f2] shadow-sm" : "text-[#6b655e] hover:text-[#1c1917]"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {view === "timeline" ? (
            <ol className="relative ml-5">
              <span className="absolute left-[19px] top-6 bottom-6 w-px bg-[#e8e2d9]" />
              {ordered.map((m, i) => {
                const meta = STATUS[m.status] || STATUS.pending;
                const busy = busyId === m._id;

                if (editingId === m._id) {
                  return (
                    <li key={m._id} className="pl-14 pb-6">
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
                  <li key={m._id} className="ms-card relative pl-14 pb-6 last:pb-0" style={{ animationDelay: `${i * 90}ms` }}>
                    <span
                      className="absolute left-0 top-5 w-10 h-10 rounded-full flex items-center justify-center border-4 border-[#faf7f2] shadow-sm"
                      style={{ background: meta.color }}
                    >
                      {m.status === "approved" ? (
                        <Check className="w-4 h-4 text-[#ffffff]" strokeWidth={3} />
                      ) : (
                        <span className="text-xs font-semibold text-[#ffffff]">{i + 1}</span>
                      )}
                    </span>

                    <div className="rounded-[26px] bg-[#ffffff] border border-[#e8e2d9] p-6 md:p-7 hover:shadow-[0_24px_50px_-30px_rgba(60,40,20,0.35)] transition-shadow duration-300">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="ms-serif text-2xl leading-tight">{m.title}</p>
                          {m.description && (
                            <p className="text-sm text-[#6b655e] mt-2 whitespace-pre-wrap leading-relaxed">{m.description}</p>
                          )}
                        </div>
                        <StatusPill status={m.status} />
                      </div>
                      {renderMeta(m)}
                      {renderDetails(m)}
                      {renderActions(m, busy)}
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="space-y-6">
              {editingMilestone && (
                <MilestoneForm
                  initial={{
                    title: editingMilestone.title,
                    description: editingMilestone.description || "",
                    dueDate: toInputDate(editingMilestone.dueDate),
                    amount: editingMilestone.amount ?? "",
                  }}
                  submitLabel="Save changes"
                  saving={busyId === editingMilestone._id}
                  onSubmit={(values) => update(editingMilestone._id, values)}
                  onCancel={() => setEditingId(null)}
                />
              )}
              <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
                {COLUMNS.map((col) => {
                  const meta = STATUS[col];
                  const items = ordered.filter((m) => m.status === col);
                  return (
                    <div key={col} className="rounded-[26px] bg-[#f4efe7] p-3">
                      <div className="flex items-center justify-between px-2 pt-2 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6b655e]">{meta.label}</span>
                        </div>
                        <span className="text-xs font-semibold bg-[#ffffff] px-2.5 py-0.5 rounded-full">{items.length}</span>
                      </div>
                      <div className="space-y-3">
                        {items.length === 0 ? (
                          <div className="rounded-2xl border-2 border-dashed border-[#d9d1c4] p-6 text-center text-xs text-[#a39c92]">
                            Nothing here
                          </div>
                        ) : (
                          items.map((m, i) => {
                            const overdue = m.status !== "approved" && m.dueDate && new Date(m.dueDate) < now;
                            return (
                              <div
                                key={m._id}
                                className="ms-card rounded-2xl bg-[#ffffff] border border-[#e8e2d9] p-4 hover:shadow-[0_18px_40px_-28px_rgba(60,40,20,0.4)] transition-shadow"
                                style={{ animationDelay: `${i * 70}ms` }}
                              >
                                <p className="ms-serif text-lg leading-snug">{m.title}</p>
                                <div className="flex items-center justify-between gap-2 mt-3 text-[11px]">
                                  <span className={overdue ? "text-[#b4475a] font-semibold" : "text-[#6b655e]"}>
                                    {m.dueDate ? `${overdue ? "Overdue · " : ""}${fmt(m.dueDate)}` : "No due date"}
                                  </span>
                                  <span className="ms-serif text-base tabular-nums">{money(m.amount)}</span>
                                </div>
                                {m.status === "changes requested" && (m.changeRequests || []).slice(-1)[0] && (
                                  <p className="mt-3 text-xs text-[#a4502d] leading-relaxed line-clamp-2">
                                    {(m.changeRequests || []).slice(-1)[0].comment}
                                  </p>
                                )}
                                {renderActions(m, busyId === m._id)}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}