import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../api/axios.js";
import { Sparkles, Send, Save, Eye, PenLine, AlertTriangle, CheckCircle2, Info, Download } from "lucide-react";

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,400;1,9..144,500&display=swap');

.wu-serif { font-family: 'Fraunces', Georgia, serif; font-weight: 500; letter-spacing: -0.025em; }

@keyframes wuIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes wuFade { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
.wu-in { animation: wuIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
.wu-fade { animation: wuFade 0.35s cubic-bezier(0.16, 1, 0.3, 1) both; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
`;

const fmtDateTime = (d) => (d ? new Date(d).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "");
const wordCount = (text = "") => (text.trim() ? text.trim().split(/\s+/).length : 0);

const btnPrimary =
  "inline-flex items-center gap-2 text-sm font-semibold bg-[#1c1917] text-[#faf7f2] px-5 py-2.5 rounded-full hover:bg-[#c4673f] transition-colors disabled:opacity-50 whitespace-nowrap";
const btnGhost =
  "inline-flex items-center gap-2 text-sm font-semibold border border-[#e8e2d9] bg-[#ffffff] text-[#1c1917] px-5 py-2.5 rounded-full hover:border-[#1c1917] transition-colors disabled:opacity-50 whitespace-nowrap";

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
  const [confirm, setConfirm] = useState(null); // "rewrite" | "send" | null
  const [view, setView] = useState("write"); // "write" | "preview"

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
    setConfirm(null);
    setGenerating(true);
    try {
      const res = await api.get(`/projects/${projectId}/ai/weekly-report`, { params: { refresh: true } });
            if (!res.data.report?.trim()) {
        // Keep whatever the user had on screen; nothing was saved.
        toast.error("The AI didn't return an update. Your text is unchanged. Please try again.");
        return;
      }
      // The server saves the generated draft, so it is already "saved".
      applyDraft({ ...res.data.draft, sentAt: res.data.draft?.sentAt || meta.sentAt }, res.data.report);
      toast.success("Draft written. Review it before sending.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't write the draft");
    } finally {
      setGenerating(false);
    }
  };

  const requestGenerate = () => {
    if (draft.trim()) return setConfirm("rewrite");
    generate();
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
    setConfirm(null);
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

    const downloadDraft = () => {
    if (!draft.trim()) return toast.error("Nothing to download yet");
    const today = new Date();
    const dateLabel = today.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
    const safeName = (project?.name || "project").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "project";
    const body = `${project?.name || "Project"}\nClient progress update · ${dateLabel}\n\n${draft.trim()}\n`;
    const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeName}-progress-update-${today.toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const requestSend = () => {
    if (!draft.trim()) return toast.error("Write or generate an update first");
    setConfirm("send");
  };

  const sentBefore = Boolean(meta.sentAt);

  return (
    <div className="wu-in relative rounded-[32px] bg-[#ffffff] border border-[#e8e2d9] p-7 md:p-9 space-y-6 shadow-[0_30px_70px_-45px_rgba(60,40,20,0.35)]">
      <style>{STYLES}</style>

      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="max-w-2xl">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#c4673f]">Client progress update</p>
          <h3 className="wu-serif text-4xl md:text-5xl mt-3 leading-tight">What your client reads this week</h3>
          <p className="mt-3 text-sm text-[#6b655e] leading-relaxed">
            AI drafts a plain-language update from real milestones, tasks and activity. You edit it, then send. Your client never sees a draft.
          </p>
        </div>
        <button className={btnPrimary} onClick={requestGenerate} disabled={generating || loading}>
          <Sparkles className="w-4 h-4" />
          {generating ? "Writing…" : draft.trim() ? "Rewrite with AI" : "Write with AI"}
        </button>
      </div>

      {confirm === "rewrite" && (
        <div className="wu-fade rounded-2xl bg-[#f7ecc9]/70 border border-[#efd9a0] p-4 flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm text-[#5c3f0d]">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Replace the current text with a new AI-written draft?
          </p>
          <div className="flex gap-2">
            <button onClick={generate} className={btnPrimary}>Yes, rewrite</button>
            <button onClick={() => setConfirm(null)} className={btnGhost}>Keep my text</button>
          </div>
        </div>
      )}

      {confirm === "send" && (
        <div className="wu-fade rounded-2xl bg-[#dcebe2]/70 border border-[#bfe3cd] p-4 flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm text-[#2f4a3e]">
            <Send className="w-4 h-4 shrink-0" />
            Send this update to <span className="font-semibold">{project.clientEmail}</span>? It will be emailed and shown in their portal.
          </p>
          <div className="flex gap-2">
            <button onClick={send} disabled={sending} className={btnPrimary}>
              {sending ? "Sending…" : "Yes, send"}
            </button>
            <button onClick={() => setConfirm(null)} className={btnGhost}>Not yet</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="h-64 rounded-[24px] bg-[#f1ece4] animate-pulse" aria-busy="true" />
      ) : (
        <>
          <div className="rounded-[28px] bg-[#faf7f2] border border-[#e8e2d9] overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-[#e8e2d9] bg-[#ffffff]">
              <div className="inline-flex p-1 rounded-full bg-[#f1ece4]">
                {[
                  { id: "write", label: "Write", icon: PenLine },
                  { id: "preview", label: "Client view", icon: Eye },
                ].map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setView(v.id)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      view === v.id ? "bg-[#1c1917] text-[#faf7f2]" : "text-[#6b655e] hover:text-[#1c1917]"
                    }`}
                  >
                    <v.icon className="w-3.5 h-3.5" />
                    {v.label}
                  </button>
                ))}
              </div>
              <span className="text-xs text-[#a39c92]">{wordCount(draft)} words</span>
            </div>

            <div className="p-6 md:p-8 min-h-[260px]">
              {view === "write" ? (
                <textarea
                  className="w-full min-h-[220px] bg-transparent resize-none text-[15px] leading-[1.85] text-[#3a342e] placeholder-[#a39c92] focus:outline-none"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Write an update yourself, or let AI draft one from this week's activity."
                />
              ) : draft.trim() ? (
                <div className="wu-serif italic text-2xl leading-snug text-[#2b2620] whitespace-pre-wrap">{draft}</div>
              ) : (
                <p className="text-sm text-[#a39c92] italic">Nothing to show yet. Write or generate an update first.</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1.5 text-xs">
              {sentBefore ? (
                <p className="flex items-center gap-1.5 text-[#3f6e5b] font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Last sent {fmtDateTime(meta.sentAt)}. This is what your client sees until you send a new one.
                </p>
              ) : (
                <p className="text-[#6b655e]">Not sent yet. Your client sees nothing until you press send.</p>
              )}
              {dirty && (
                <p className="flex items-center gap-1.5 text-[#8a6418] font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" /> You have unsaved changes.
                </p>
              )}
              {!hasClient && (
                <p className="flex items-center gap-1.5 text-[#a4502d]">
                  <Info className="w-3.5 h-3.5" /> Invite your client first (Client tab) so there is someone to send this to.
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button className={btnGhost} onClick={downloadDraft} disabled={!draft.trim()}>
                <Download className="w-4 h-4" />
                Download
              </button>
              <button className={btnGhost} onClick={save} disabled={saving || !dirty}>
                <Save className="w-4 h-4" />
                {saving ? "Saving…" : "Save draft"}
              </button>
              <button className={btnPrimary} onClick={requestSend} disabled={sending || !draft.trim() || !hasClient}>
                <Send className="w-4 h-4" />
                {sending ? "Sending…" : "Send to client"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}