import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import toast from "react-hot-toast";
import api from "../api/axios.js";
import ShareToggle from "./ShareToggle.jsx";
import { Sparkles, Brain, CheckSquare, Edit, Trash2, ChevronDown, ChevronUp, AlertCircle, FileText } from "lucide-react";

function NoteCard({ note, canEdit, onDeleted, onUpdated }) {
  const [aiResult, setAiResult] = useState(null);
  const [aiLabel, setAiLabel] = useState("");
  const [loadingAction, setLoadingAction] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(note.title);
  const [editContent, setEditContent] = useState(note.content);
  const [saving, setSaving] = useState(false);

  const runAction = async (action) => {
    setLoadingAction(action);
    setAiResult(null);
    try {
      if (action === "explain") {
        const res = await api.post(`/notes/${note._id}/explain`);
        setAiResult(res.data.explanation);
        setAiLabel("AI Explanation");
      } else if (action === "improve") {
        const res = await api.post(`/notes/${note._id}/improve`);
        setAiResult(res.data.suggestions);
        setAiLabel("Suggested Improvements");
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
      onUpdated(res.data.note);
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
      <div className="card p-6 space-y-4 border-indigo-500/30 ring-1 ring-indigo-500/20 shadow-lg">
        <input className="input font-semibold text-base" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
        <textarea
          className="input font-mono text-xs leading-relaxed"
          rows={6}
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
        />
        <div className="flex gap-2 justify-end pt-1">
          <button className="btn btn-secondary text-xs" onClick={cancelEdit} disabled={saving}>
            Cancel
          </button>
          <button className="btn btn-primary text-xs px-5" onClick={handleSaveEdit} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6 space-y-4 hover:border-slate-700/80 transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <h4 className="text-base font-bold text-white dark:text-white light:text-slate-900 leading-snug">{note.title}</h4>
          <p className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-500 font-medium">
            By {note.author?.name || "Unknown"} · {new Date(note.createdAt).toLocaleString()}
            {note.updatedAt && note.updatedAt !== note.createdAt && (
              <span> · edited {new Date(note.updatedAt).toLocaleString()}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <ShareToggle shared={Boolean(note.isShared)} onChange={canEdit ? handleShare : undefined} />
          {canEdit && (
            <div className="flex items-center gap-1.5">
              <button onClick={() => setIsEditing(true)} className="p-1.5 text-slate-400 hover:text-indigo-400 rounded-lg hover:bg-slate-800" title="Edit Note">
                <Edit className="w-4 h-4" />
              </button>
              <button onClick={() => setConfirmingDelete(true)} className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10" title="Delete Note">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {confirmingDelete && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 text-xs flex items-center justify-between gap-3 animate-fadeIn">
          <p className="text-rose-300 font-medium">
            ⚠️ Delete "<span className="font-bold">{note.title}</span>"? This cannot be undone.
          </p>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={handleDelete} className="btn btn-danger text-xs py-1.5 px-3">
              Delete
            </button>
            <button onClick={() => setConfirmingDelete(false)} className="btn btn-secondary text-xs py-1.5 px-3">
              Cancel
            </button>
          </div>
        </div>
      )}

      {note.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {note.tags.map((t) => (
            <span key={t} className="badge bg-indigo-500/10 text-indigo-400 dark:text-indigo-300 light:text-indigo-700 border-indigo-500/30">
              #{t}
            </span>
          ))}
        </div>
      )}

      <div className={`prose prose-invert max-w-none text-xs leading-relaxed text-slate-300 dark:text-slate-300 light:text-slate-700 ${expanded ? "" : "line-clamp-4"}`}>
        <ReactMarkdown>{note.content}</ReactMarkdown>
      </div>

      <button className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 pt-1" onClick={() => setExpanded((e) => !e)}>
        {expanded ? <>Show less <ChevronUp className="w-3.5 h-3.5" /></> : <>Show more <ChevronDown className="w-3.5 h-3.5" /></>}
      </button>

      {/* AI Assistance Toolbar */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800/60 dark:border-slate-800/60 light:border-slate-200">
        <button className="btn btn-secondary text-xs py-1.5 px-3" disabled={loadingAction} onClick={() => runAction("explain")}>
          <Brain className="w-3.5 h-3.5 text-indigo-400" />
          <span>{loadingAction === "explain" ? "Explaining..." : "Explain"}</span>
        </button>
        {canEdit && (
          <button className="btn btn-secondary text-xs py-1.5 px-3" disabled={loadingAction} onClick={() => runAction("improve")}>
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{loadingAction === "improve" ? "Thinking..." : "Improve"}</span>
          </button>
        )}
        {canEdit && (
          <button className="btn btn-secondary text-xs py-1.5 px-3" disabled={loadingAction} onClick={() => runAction("tasks")}>
            <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
            <span>{loadingAction === "tasks" ? "Extracting..." : "Extract Tasks"}</span>
          </button>
        )}
      </div>

      {aiResult && (
        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4 text-xs space-y-2 animate-fadeIn">
          <p className="font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            {aiLabel}
          </p>
          <div className="whitespace-pre-wrap text-slate-200 leading-relaxed font-sans">{aiResult}</div>
        </div>
      )}
    </div>
  );
}

export default function NotesList({ notes, canEdit = true, onDeleted, onUpdated }) {
  if (notes.length === 0) {
    return (
      <div className="card p-10 text-center text-slate-400 space-y-2">
        <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto">
          <FileText className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-white dark:text-white light:text-slate-900">No notes yet</p>
        <p className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-500 max-w-sm mx-auto">
          Notes are kept internal to your team until you toggle the client share switch.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {notes.map((n) => (
        <NoteCard key={n._id} note={n} canEdit={canEdit} onDeleted={onDeleted} onUpdated={onUpdated} />
      ))}
    </div>
  );
}