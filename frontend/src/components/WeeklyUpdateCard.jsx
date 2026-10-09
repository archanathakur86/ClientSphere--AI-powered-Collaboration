import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../api/axios.js";
import { Sparkles, Send, Save, CheckCircle2, Clock, AlertCircle } from "lucide-react";

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
    <div className="card p-6 space-y-5 border-indigo-500/20 shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 dark:border-slate-800 light:border-slate-200 pb-4">
        <div className="space-y-1">
          <h4 className="font-bold text-base text-white dark:text-white light:text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <span>Executive Progress Report</span>
          </h4>
          <p className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-500">
            AI generates plain-language progress updates from project milestones and activity. Edit before sending to the client portal.
          </p>
        </div>
        <button className="btn btn-primary text-xs px-4 py-2" onClick={generate} disabled={generating || loading}>
          <Sparkles className="w-3.5 h-3.5" />
          <span>{generating ? "Writing…" : draft.trim() ? "Rewrite with AI" : "Draft with AI"}</span>
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-400 text-xs">Loading report draft...</div>
      ) : (
        <div className="space-y-4">
          <textarea
            className="input min-h-52 font-sans text-xs leading-relaxed"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write an update yourself, or let AI draft one from this week's milestones & activity."
          />
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-500 space-y-1">
              <div>
                {meta.sentAt ? (
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Last sent {fmtDateTime(meta.sentAt)}. Shown in client portal.
                  </span>
                ) : (
                  <span>Draft unreleased. Your client sees nothing until you publish.</span>
                )}
              </div>
              {dirty && <div className="text-amber-400 font-medium">⚠️ Unsaved changes in text box.</div>}
              {!hasClient && <div className="text-indigo-400 font-medium">Connect a client email first in the Client tab to send.</div>}
            </div>
            <div className="flex gap-2">
              <button className="btn btn-secondary text-xs px-4 py-2" onClick={save} disabled={saving || !dirty}>
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? "Saving…" : "Save Draft"}</span>
              </button>
              <button className="btn btn-primary text-xs px-5 py-2" onClick={send} disabled={sending || !draft.trim() || !hasClient}>
                <Send className="w-3.5 h-3.5" />
                <span>{sending ? "Sending…" : "Send to Client"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}