import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import toast from "react-hot-toast";
import api from "../api/axios.js";
import ShareToggle from "./ShareToggle.jsx";
import { Pencil, Trash2, Lightbulb, Wand2, ListChecks, ChevronDown, ChevronUp, AlertTriangle, StickyNote, X, Check } from "lucide-react";

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,400;1,9..144,500&display=swap');

.nl-serif { font-family: 'Fraunces', Georgia, serif; font-weight: 500; letter-spacing: -0.02em; }

@keyframes nlIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes nlFade { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
.nl-card { animation: nlIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) backwards; }
.nl-fade { animation: nlFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) both; }

.nl-md p { margin: 0.5em 0; line-height: 1.75; color: #3a342e; }
.nl-md h1, .nl-md h2, .nl-md h3 { font-family: 'Fraunces', Georgia, serif; color: #1c1917; margin: 0.9em 0 0.4em; line-height: 1.2; }
.nl-md h1 { font-size: 1.5rem; }
.nl-md h2 { font-size: 1.25rem; }
.nl-md h3 { font-size: 1.05rem; }
.nl-md ul { list-style: disc; padding-left: 1.25em; margin: 0.5em 0; }
.nl-md ol { list-style: decimal; padding-left: 1.25em; margin: 0.5em 0; }
.nl-md li { margin: 0.2em 0; }
.nl-md code { background: #f4efe7; padding: 0.1em 0.4em; border-radius: 6px; font-size: 0.9em; }
.nl-md pre { background: #1c1917; color: #faf7f2; padding: 1rem; border-radius: 16px; overflow-x: auto; margin: 0.8em 0; }
.nl-md pre code { background: none; padding: 0; color: inherit; }
.nl-md blockquote { border-left: 3px solid #c4673f; padding-left: 1em; color: #6b655e; margin: 0.8em 0; font-style: italic; }
.nl-md strong { color: #1c1917; }

.nl-clamp { max-height: 11rem; overflow: hidden; position: relative; }
.nl-clamp::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 4rem; background: linear-gradient(to bottom, rgba(255,255,255,0), #ffffff); pointer-events: none; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
`;

const TINTS = ["#f6dccb", "#dcebe2", "#f7ecc9", "#efe6f0", "#e4eef7"];
const INK_TINTS = ["#a4502d", "#3f6e5b", "#8a6418", "#6e4a78", "#3d6584"];

const pillBtn =
  "inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-full border border-[#e8e2d9] bg-[#ffffff] text-[#1c1917] hover:border-[#c4673f] hover:text-[#a4502d] transition-colors disabled:opacity-50";
const inputCls =
  "w-full px-4 py-3 bg-[#ffffff] border border-[#e8e2d9] rounded-2xl text-sm placeholder-[#a39c92] focus:outline-none focus:border-[#c4673f] focus:ring-2 focus:ring-[#f6dccb]";

// Full date + time, e.g. "10 Oct 2026, 3:42 PM"
const stamp = (d) =>
  new Date(d).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

const initials = (name) =>
  (name || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

function NoteCard({ note, index, canEdit, onDeleted, onUpdated }) {
  const [aiResult, setAiResult] = useState(null);
  const [aiLabel, setAiLabel] = useState("");
  const [loadingAction, setLoadingAction] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(note.title);
  const [editContent, setEditContent] = useState(note.content);
  const [saving, setSaving] = useState(false);

  const tint = TINTS[index % TINTS.length];
  const ink = INK_TINTS[index % INK_TINTS.length];
  const longNote = note.content.length > 260;
  const wasEdited = note.updatedAt && new Date(note.updatedAt) - new Date(note.createdAt) > 1000;

  const runAction = async (action) => {
    setLoadingAction(action);
    setAiResult(null);
    try {
      if (action === "explain") {
        const res = await api.post(`/notes/${note._id}/explain`);
        setAiResult(res.data.explanation);
        setAiLabel("Explanation");
      } else if (action === "improve") {
        const res = await api.post(`/notes/${note._id}/improve`);
        setAiResult(res.data.suggestions);
        setAiLabel("Suggested improvements");
      } else if (action === "tasks") {
        const res = await api.post(`/notes/${note._id}/extract-tasks`);
        if (res.data.tasks.length === 0) {
          toast(res.data.message || "No action items found");
        } else {
          toast.success(`${res.data.tasks.length} task(s) extracted! Check the Tasks tab.`);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "AI action failed");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleShare = async (next) => {
    try {
      await api.patch(`/notes/${note._id}/visibility`, { isShared: next });
      // The endpoint returns an unpopulated note, so only merge the flag (keeps the author name).
      onUpdated({ ...note, isShared: next });
      toast.success(next ? "Shared with the client" : "Now internal only");
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't change visibility");
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/notes/${note._id}`);
      toast.success("Note deleted");
      onDeleted(note._id);
    } catch (err) {
      toast.error("Failed to delete note");
    } finally {
      setConfirmingDelete(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim() || !editContent.trim()) {
      toast.error("Title and content cannot be empty");
      return;
    }
    setSaving(true);
    try {
      const res = await api.patch(`/notes/${note._id}`, { title: editTitle, content: editContent });
      toast.success("Note updated");
      // Keep the author we already have (the update response is not populated).
      onUpdated({ ...note, ...res.data.note, author: note.author });
      setIsEditing(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update note");
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditTitle(note.title);
    setEditContent(note.content);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="nl-card rounded-[28px] bg-[#ffffff] border border-[#c4673f]/40 shadow-[0_24px_60px_-35px_rgba(196,103,63,0.4)] p-7 space-y-4">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[#c4673f]">Editing</p>
        <input className={`${inputCls} nl-serif text-xl`} value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
        <textarea
          className={`${inputCls} resize-none leading-relaxed`}
          rows={8}
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
        />
        <div className="flex gap-3">
          <button
            onClick={handleSaveEdit}
            disabled={saving}
            className="inline-flex items-center gap-2 text-sm font-semibold bg-[#1c1917] text-[#faf7f2] px-5 py-2.5 rounded-full hover:bg-[#c4673f] transition-colors disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            {saving ? "Saving…" : "Save changes"}
          </button>
          <button
            onClick={cancelEdit}
            disabled={saving}
            className="text-sm font-semibold px-5 py-2.5 rounded-full border border-[#e8e2d9] hover:border-[#1c1917] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <article
      className="nl-card group relative flex flex-col rounded-[28px] bg-[#ffffff] border border-[#e8e2d9] overflow-hidden hover:-translate-y-1 hover:shadow-[0_28px_60px_-34px_rgba(60,40,20,0.35)] transition-all duration-500"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <span className="absolute top-0 left-0 right-0 h-1.5" style={{ background: ink }} />

      <div className="p-7 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="w-10 h-10 rounded-full flex items-center justify-center nl-serif text-base shrink-0"
              style={{ background: tint, color: ink }}
            >
              {initials(note.author?.name)}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{note.author?.name || "Unknown"}</p>
              <p className="text-[11px] text-[#a39c92]">
                {stamp(note.createdAt)}
                {wasEdited && <span className="ml-1.5 font-semibold text-[#c4673f]">· Edited {stamp(note.updatedAt)}</span>}
              </p>
            </div>
          </div>
          <div className="shrink-0">
            <ShareToggle shared={Boolean(note.isShared)} onChange={canEdit ? handleShare : undefined} />
          </div>
        </div>

        <h4 className="nl-serif text-3xl leading-[1.1] mt-6">{note.title}</h4>

        {note.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {note.tags.map((t) => (
              <span key={t} className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full" style={{ background: tint, color: ink }}>
                #{t}
              </span>
            ))}
          </div>
        )}

        <div className={`nl-md mt-5 text-[15px] ${!expanded && longNote ? "nl-clamp" : ""}`}>
          <ReactMarkdown>{note.content}</ReactMarkdown>
        </div>

        {longNote && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#c4673f] hover:text-[#1c1917] transition-colors self-start"
          >
            {expanded ? (
              <>
                Show less <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                Read more <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        )}

        {confirmingDelete && (
          <div className="nl-fade mt-5 rounded-2xl bg-[#f9e1d6]/60 border border-[#f2c9b8] p-4 flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm text-[#a4502d]">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Delete "<span className="font-semibold">{note.title}</span>"? This can't be undone.
            </p>
            <div className="flex gap-2">
              <button onClick={handleDelete} className="text-xs font-semibold bg-[#b4475a] text-[#faf7f2] px-4 py-2 rounded-full hover:bg-[#8f3346] transition-colors">
                Delete
              </button>
              <button onClick={() => setConfirmingDelete(false)} className="text-xs font-semibold border border-[#e8e2d9] bg-[#ffffff] px-4 py-2 rounded-full hover:border-[#1c1917] transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* AI + actions footer */}
      <div className="px-7 py-4 border-t border-[#e8e2d9] bg-[#faf7f2]/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button className={pillBtn} disabled={loadingAction} onClick={() => runAction("explain")}>
            <Lightbulb className="w-3.5 h-3.5" />
            {loadingAction === "explain" ? "Explaining…" : "Explain"}
          </button>
          {canEdit && (
            <button className={pillBtn} disabled={loadingAction} onClick={() => runAction("improve")}>
              <Wand2 className="w-3.5 h-3.5" />
              {loadingAction === "improve" ? "Thinking…" : "Improve"}
            </button>
          )}
          {canEdit && (
            <button className={pillBtn} disabled={loadingAction} onClick={() => runAction("tasks")}>
              <ListChecks className="w-3.5 h-3.5" />
              {loadingAction === "tasks" ? "Extracting…" : "Extract tasks"}
            </button>
          )}
        </div>
        {canEdit && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6b655e] px-3 py-2 rounded-full hover:bg-[#f4efe7] hover:text-[#1c1917] transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
            <button
              onClick={() => setConfirmingDelete(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#b4475a] px-3 py-2 rounded-full hover:bg-[#f9e1d6] transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        )}
      </div>

      {aiResult && (
        <div className="nl-fade mx-7 mb-7 rounded-2xl bg-[#ffffff] border border-[#e8e2d9] p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="nl-serif text-xl" style={{ color: ink }}>
              {aiLabel}
            </p>
            <button onClick={() => setAiResult(null)} className="w-7 h-7 rounded-full hover:bg-[#f4efe7] flex items-center justify-center" aria-label="Dismiss">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="nl-md mt-3 text-sm">
            <ReactMarkdown>{aiResult}</ReactMarkdown>
          </div>
        </div>
      )}
    </article>
  );
}

export default function NotesList({ notes, canEdit = true, onDeleted, onUpdated }) {
  if (notes.length === 0) {
    return (
      <div className="rounded-[32px] border-2 border-dashed border-[#d9d1c4] bg-[#ffffff] p-14 text-center">
        <style>{STYLES}</style>
        <div className="w-16 h-16 mx-auto rounded-2xl bg-[#f7ecc9] flex items-center justify-center">
          <StickyNote className="w-7 h-7 text-[#8a6418]" />
        </div>
        <h3 className="nl-serif text-4xl mt-7">Your project's memory starts here</h3>
        <p className="mt-3 text-sm text-[#6b655e] max-w-md mx-auto leading-relaxed">
          Capture decisions, meeting notes and ideas. Notes stay internal until you share them with the client.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <style>{STYLES}</style>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#6b655e]">Library</p>
          <p className="nl-serif text-4xl mt-2">
            {notes.length} note{notes.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-6 items-start">
        {notes.map((n, i) => (
          <NoteCard key={n._id} note={n} index={i} canEdit={canEdit} onDeleted={onDeleted} onUpdated={onUpdated} />
        ))}
      </div>
    </div>
  );
}