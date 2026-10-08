import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import toast from "react-hot-toast";
import api from "../api/axios.js";
import ShareToggle from "./ShareToggle.jsx";

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
        setAiLabel("Explanation");
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
      <div className="card space-y-3 border-indigo-500/30 ring-1 ring-indigo-500/20">
        <input className="input font-medium" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
        <textarea
          className="input font-mono text-sm"
          rows={6}
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
        />
        <div className="flex gap-2">
          <button className="btn btn-primary text-sm" onClick={handleSaveEdit} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button className="btn btn-secondary text-sm" onClick={cancelEdit} disabled={saving}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-semibold">{note.title}</h4>
          <p className="text-xs text-slate-400">
            By {note.author?.name || "Unknown"} · {new Date(note.createdAt).toLocaleString()}
            {note.updatedAt && note.updatedAt !== note.createdAt && (
              <span> · edited {new Date(note.updatedAt).toLocaleString()}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <ShareToggle shared={Boolean(note.isShared)} onChange={canEdit ? handleShare : undefined} />
          {canEdit && (
            <>
              <button onClick={() => setIsEditing(true)} className="text-xs text-indigo-400 hover:underline">
                Edit
              </button>
              <button onClick={() => setConfirmingDelete(true)} className="text-xs text-red-400 hover:underline">
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {confirmingDelete && (
        <div className="mt-3 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm flex items-center justify-between gap-3">
          <p className="text-amber-200">
            ⚠️ This will permanently delete "<span className="font-medium">{note.title}</span>". This action cannot be undone.
          </p>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={handleDelete} className="btn text-xs py-1 px-3 bg-red-600 text-white hover:bg-red-700">
              Delete
            </button>
            <button onClick={() => setConfirmingDelete(false)} className="btn btn-secondary text-xs py-1 px-3">
              Cancel
            </button>
          </div>
        </div>
      )}

      {note.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {note.tags.map((t) => (
            <span key={t} className="text-xs bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded-full">
              #{t}
            </span>
          ))}
        </div>
      )}

      <div className={`prose prose-sm max-w-none mt-3 ${expanded ? "" : "line-clamp-4"}`}>
        <ReactMarkdown>{note.content}</ReactMarkdown>
      </div>
      <button className="text-xs text-indigo-400 mt-1" onClick={() => setExpanded((e) => !e)}>
        {expanded ? "Show less" : "Show more"}
      </button>

      <div className="flex flex-wrap gap-2 mt-3">
        <button className="btn btn-secondary text-xs py-1" disabled={loadingAction} onClick={() => runAction("explain")}>
          {loadingAction === "explain" ? "Explaining..." : "🧠 Explain"}
        </button>
        {canEdit && (
          <button className="btn btn-secondary text-xs py-1" disabled={loadingAction} onClick={() => runAction("improve")}>
            {loadingAction === "improve" ? "Thinking..." : "✨ Improve"}
          </button>
        )}
        {canEdit && (
          <button className="btn btn-secondary text-xs py-1" disabled={loadingAction} onClick={() => runAction("tasks")}>
            {loadingAction === "tasks" ? "Extracting..." : "✅ Extract Tasks"}
          </button>
        )}
      </div>

      {aiResult && (
        <div className="mt-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3 text-sm">
          <p className="font-medium text-indigo-300 mb-1">{aiLabel}</p>
          <div className="whitespace-pre-wrap text-slate-300">{aiResult}</div>
        </div>
      )}
    </div>
  );
}

export default function NotesList({ notes, canEdit = true, onDeleted, onUpdated }) {
  if (notes.length === 0) {
    return <div className="card text-center py-8 text-slate-400">No notes yet. Notes are internal until you share them with the client.</div>;
  }
  return (
    <div className="space-y-3">
      {notes.map((n) => (
        <NoteCard key={n._id} note={n} canEdit={canEdit} onDeleted={onDeleted} onUpdated={onUpdated} />
      ))}
    </div>
  );
}