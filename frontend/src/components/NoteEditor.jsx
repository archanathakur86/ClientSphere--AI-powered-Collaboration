import React, { useState } from "react";
import toast from "react-hot-toast";
import api from "../api/axios.js";
import { Sparkles, FileText, Save } from "lucide-react";

export default function NoteEditor({ projectId, onCreated }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error("Title and content are required");
      return;
    }
    setSaving(true);
    try {
      const res = await api.post(`/projects/${projectId}/notes`, { title, content });
      if (res.data.duplicateWarning?.isDuplicate) {
        toast(`⚠️ This looks similar to an existing note: ${res.data.duplicateWarning.reason}`, {
          duration: 5000,
        });
      } else {
        toast.success("Note saved");
      }
      setTitle("");
      setContent("");
      onCreated(res.data.note);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save note");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card p-6 space-y-4 border-indigo-500/20 shadow-md">
      <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs">
        <FileText className="w-4 h-4" />
        <span>Create Workspace Note</span>
      </div>

      <input
        className="input font-semibold text-base"
        placeholder="Note title e.g. Product Architecture & Sprint Goals"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className="input font-mono text-xs leading-relaxed"
        rows={6}
        placeholder="Write markdown here... e.g. ## Meeting notes&#10;- discussed X&#10;- next step: Y"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <div className="flex justify-end pt-1">
        <button className="btn btn-primary text-xs px-5 py-2.5" onClick={handleSave} disabled={saving}>
          <Save className="w-3.5 h-3.5" />
          <span>{saving ? "Saving & AI tagging..." : "Save Note"}</span>
        </button>
      </div>
    </div>
  );
}