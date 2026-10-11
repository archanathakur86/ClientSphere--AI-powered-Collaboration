import React, { useState } from "react";
import toast from "react-hot-toast";
import api from "../api/axios.js";
import { Sparkles, Trash2, Loader2, Check, Lightbulb } from "lucide-react";

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,400;1,9..144,500&display=swap');
.pd-serif { font-family: 'Fraunces', Georgia, serif; font-weight: 500; letter-spacing: -0.025em; }
@keyframes pdIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
.pd-in { animation: pdIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
`;

const inputCls =
  "w-full px-3 py-2.5 bg-[#ffffff] border border-[#e8e2d9] rounded-xl text-sm placeholder-[#a39c92] focus:outline-none focus:border-[#c4673f] focus:ring-2 focus:ring-[#f6dccb]";

// Paste a client's brief, get a draft set of milestones, edit it, then add it to the project.
// Nothing is saved until the freelancer presses "Add to project".
export default function ProposalDrafter({ projectId, canEdit, onCreated }) {
  const [brief, setBrief] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [proposal, setProposal] = useState(null);

  if (!canEdit) return null;

  const draft = async () => {
    setDrafting(true);
    try {
      const res = await api.post(`/projects/${projectId}/ai/proposal`, { brief });
      setProposal(res.data.proposal);
      toast.success("Draft ready. Review it before adding it to the project.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't draft a proposal");
    } finally {
      setDrafting(false);
    }
  };

  const updateRow = (i, patch) =>
    setProposal((p) => ({ ...p, milestones: p.milestones.map((m, idx) => (idx === i ? { ...m, ...patch } : m)) }));

  const removeRow = (i) => setProposal((p) => ({ ...p, milestones: p.milestones.filter((_, idx) => idx !== i) }));

  const addToProject = async () => {
    if (!proposal?.milestones.length) return;
    setCreating(true);
    let added = 0;
    try {
      for (const m of proposal.milestones) {
        await api.post(`/projects/${projectId}/milestones`, {
          title: m.title,
          description: m.description,
          amount: m.amount,
          dueDate: m.dueDate,
        });
        added += 1;
      }
      toast.success(`${added} milestones added to the project`);
      setProposal(null);
      setBrief("");
      onCreated?.();
    } catch (err) {
      toast.error(err.response?.data?.message || `Stopped after ${added} milestones. Check the list and try again.`);
      if (added > 0) onCreated?.();
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="pd-in rounded-[28px] bg-[#ffffff] border border-[#e8e2d9] p-6 md:p-7 mb-6">
      <style>{STYLES}</style>

      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-2xl bg-[#f6dccb] flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-[#a4502d]" />
        </span>
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#c4673f]">From a client brief</p>
          <p className="pd-serif text-2xl mt-1">Draft milestones in seconds</p>
          <p className="mt-1 text-sm text-[#6b655e]">Paste the client's email or call notes. You review everything before it is added.</p>
        </div>
      </div>

      {!proposal && (
        <div className="mt-5 space-y-3">
          <textarea
            className={`${inputCls} min-h-[120px] resize-none overflow-hidden`}
            onInput={(e) => {
              e.target.style.height = "auto";
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            placeholder="e.g. They need a landing page and a booking form, delivered in 3 weeks, budget around $2,500. Blog and admin panel are out of scope for now."
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-[#a39c92]">{brief.trim().length} / 8000 characters</p>
            <button
              onClick={draft}
              disabled={drafting || brief.trim().length < 20}
              className="inline-flex items-center gap-2 text-sm font-semibold bg-[#1c1917] text-[#faf7f2] px-5 py-2.5 rounded-full hover:bg-[#c4673f] transition-colors disabled:opacity-40"
            >
              {drafting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {drafting ? "Drafting…" : "Draft milestones"}
            </button>
          </div>
        </div>
      )}

      {proposal && (
        <div className="mt-6 space-y-5">
          {proposal.scopeSummary && (
            <div className="rounded-2xl bg-[#faf7f2] border border-[#e8e2d9] p-4">
              <p className="text-[11px] uppercase tracking-wider text-[#6b655e]">Scope</p>
              <p className="mt-1 text-sm text-[#3a342e] leading-relaxed">{proposal.scopeSummary}</p>
            </div>
          )}

          <ul className="space-y-3">
            {proposal.milestones.map((m, i) => (
              <li key={i} className="rounded-2xl border border-[#e8e2d9] p-4 grid md:grid-cols-[1fr_auto_auto_auto] gap-3 items-start">
                <div className="space-y-2 min-w-0">
                  <input className={inputCls} value={m.title} onChange={(e) => updateRow(i, { title: e.target.value })} />
                  <input
                    className={inputCls}
                    value={m.description}
                    onChange={(e) => updateRow(i, { description: e.target.value })}
                    placeholder="What the client receives"
                  />
                </div>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className={`${inputCls} md:w-32`}
                  value={m.amount}
                  onChange={(e) => updateRow(i, { amount: Number(e.target.value) || 0 })}
                  aria-label="Amount in USD"
                />
                <input
                  type="date"
                  className={`${inputCls} md:w-40`}
                  value={m.dueDate}
                  onChange={(e) => updateRow(i, { dueDate: e.target.value })}
                  aria-label="Due date"
                />
                <button
                  onClick={() => removeRow(i)}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-[#a39c92] hover:bg-[#f9e1d6] hover:text-[#b4475a] transition-colors justify-self-end"
                  aria-label="Remove milestone"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>

          {proposal.assumptions.length > 0 && (
            <div className="rounded-2xl bg-[#f7ecc9]/60 border border-[#efd9a0] p-4">
              <p className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-[#8a6418] font-semibold">
                <Lightbulb className="w-3.5 h-3.5" /> Check these assumptions
              </p>
              <ul className="mt-2 space-y-1 text-sm text-[#5c3f0d] list-disc pl-5">
                {proposal.assumptions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={() => setProposal(null)}
              disabled={creating}
              className="text-sm font-semibold text-[#6b655e] hover:text-[#1c1917] transition-colors"
            >
              Start over
            </button>
            <button
              onClick={addToProject}
              disabled={creating || proposal.milestones.length === 0}
              className="inline-flex items-center gap-2 text-sm font-semibold bg-[#1c1917] text-[#faf7f2] px-5 py-2.5 rounded-full hover:bg-[#c4673f] transition-colors disabled:opacity-40"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {creating ? "Adding…" : `Add ${proposal.milestones.length} milestones to project`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}