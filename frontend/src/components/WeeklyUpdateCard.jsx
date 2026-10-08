import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../api/axios.js";

const fmtDateTime = (d) => (d ? new Date(d).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "");

// The client-facing progress update. Nothing here reaches the client until "Send to client":
// that publishes exactly the text in the box to the portal and emails it.
export default function WeeklyUpdateCard({ projectId, project }) {
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState("");
  const [meta, setMeta] = useState({ generatedAt: null, sentAt: null });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  const applyDraft = useCallback((info, content) => {
    const text = content ?? info?.content ?? "";
    setDraft(text);
    setSaved(text);
    setMeta({ generatedAt: info?.generatedAt || null, sentAt: info?.sentAt || null });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(`/projects/${projectId}/ai/weekly-draft`);
        if (!cancelled) applyDraft(res.data.draft);
      } catch (err) {
        if (!cancelled) toast.error(err.response?.data?.message || "Couldn't load the update draft");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, applyDraft]);

  const dirty = draft !== saved;
  const hasClient = Boolean(project?.clientEmail);

  const generate = async () => {
    if (draft.trim() && !window.confirm("Replace the current text with a new AI-written draft?")) return;
    setGenerating(true);
    try {
      const res = await api.get(`/projects/${projectId}/ai/weekly-report`, { params: { refresh: true } });
      // The server saves the generated draft, so it is already "saved".
      applyDraft({ ...res.data.draft, sentAt: res.data.draft?.sentAt || meta.sentAt }, res.data.report);
      toast.success("Draft written. Review it before sending.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't write the draft");
    } finally {
      setGenerating(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.patch(`/projects/${projectId}/ai/weekly-draft`, { content: draft });
      setSaved(res.data.draft?.content ?? draft);
      toast.success("Draft saved");
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't save the draft");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const send = async () => {
    if (!draft.trim()) return toast.error("Write or generate an update first");
    if (!window.confirm(`Send this update to ${project.clientEmail}?\n\nIt will be emailed and shown in their portal.`)) return;
    setSending(true);
    try {
      // Always send what is on screen: save unsaved edits first.
      if (dirty) {
        const ok = await save();
        if (!ok) return;
      }
      const res = await api.post(`/projects/${projectId}/ai/weekly-draft/send`);
      setMeta((m) => ({ ...m, sentAt: res.data.draft?.sentAt || new Date().toISOString() }));
      toast.success("Update sent to your client");
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't send the update");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="card space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="font-semibold">Client progress update</h4>
          <p className="text-sm text-slate-400 mt-1">
            AI drafts a plain-language update from real milestones, tasks and activity. You edit it, then send. Your client never sees a draft.
          </p>
        </div>
        <button className="btn btn-primary text-sm whitespace-nowrap" onClick={generate} disabled={generating || loading}>
          {generating ? "Writing…" : draft.trim() ? "Rewrite with AI" : "Write with AI"}
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <>
          <textarea
            className="input min-h-48 text-sm leading-relaxed"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write an update yourself, or let AI draft one from this week's activity."
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-500 space-y-0.5">
              <div>
                {meta.sentAt ? (
                  <span className="text-emerald-300">Last sent {fmtDateTime(meta.sentAt)}. This is what your client sees until you send a new one.</span>
                ) : (
                  <span>Not sent yet. Your client sees nothing until you press send.</span>
                )}
              </div>
              {dirty && <div className="text-amber-300">You have unsaved changes.</div>}
              {!hasClient && <div className="text-indigo-300">Invite your client first (Client tab) so there is someone to send this to.</div>}
            </div>
            <div className="flex gap-2">
              <button className="btn btn-secondary text-sm" onClick={save} disabled={saving || !dirty}>
                {saving ? "Saving…" : "Save draft"}
              </button>
              <button className="btn btn-primary text-sm" onClick={send} disabled={sending || !draft.trim() || !hasClient}>
                {sending ? "Sending…" : "Send to client"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}