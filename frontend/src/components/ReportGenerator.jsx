import React, { useState } from "react";
import toast from "react-hot-toast";
import api from "../api/axios.js";
import Markdown from "./Markdown.jsx";
import WeeklyUpdateCard from "./WeeklyUpdateCard.jsx";
import { Sparkles, FileCode, Edit3, Save, RotateCcw } from "lucide-react";

export default function ReportGenerator({ projectId, project, initialReadme, onReadmeGenerated }) {
  const [readme, setReadme] = useState(initialReadme || "");
  const [readmeGeneratedOnce, setReadmeGeneratedOnce] = useState(!!initialReadme);
  const [loadingReadme, setLoadingReadme] = useState(false);
  const [editingReadme, setEditingReadme] = useState(false);
  const [savingReadme, setSavingReadme] = useState(false);

  const generateReadme = async () => {
    setLoadingReadme(true);
    try {
      const res = await api.post(`/projects/${projectId}/ai/readme`);
      setReadme(res.data.readme);
      setReadmeGeneratedOnce(true);
      toast.success("README generated and saved to project");
      onReadmeGenerated?.(res.data.readme);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to generate README");
    } finally {
      setLoadingReadme(false);
    }
  };

  const saveReadmeEdit = async () => {
    setSavingReadme(true);
    try {
      await api.patch(`/projects/${projectId}`, { readme });
      toast.success("README updated");
      onReadmeGenerated?.(readme);
      setEditingReadme(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save README");
    } finally {
      setSavingReadme(false);
    }
  };

  return (
    <div className="space-y-6">
      <WeeklyUpdateCard projectId={projectId} project={project} />

      <div className="card p-6 space-y-4 border-indigo-500/20 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 dark:border-slate-800 light:border-slate-200 pb-3">
          <div>
            <h4 className="font-bold text-base text-white dark:text-white light:text-slate-900 flex items-center gap-2">
              <FileCode className="w-5 h-5 text-indigo-400" />
              <span>AI README & Documentation Generator</span>
            </h4>
            <p className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-500 mt-0.5">
              Scans workspace code files, notes, and milestones to generate comprehensive documentation.
            </p>
          </div>
          <button
            className="btn btn-primary text-xs px-4 py-2"
            onClick={generateReadme}
            disabled={loadingReadme || readmeGeneratedOnce}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{loadingReadme ? "Writing..." : readmeGeneratedOnce ? "Generated ✓" : "Generate README"}</span>
          </button>
        </div>

        {readmeGeneratedOnce && (
          <button
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
            onClick={() => setReadmeGeneratedOnce(false)}
          >
            <RotateCcw className="w-3 h-3" />
            <span>Regenerate documentation from scratch</span>
          </button>
        )}

        {readme && !editingReadme && (
          <div className="space-y-3">
            <div className="bg-slate-950/60 dark:bg-slate-950/60 light:bg-slate-50 border border-slate-800/80 dark:border-slate-800/80 light:border-slate-200 rounded-2xl p-5 max-h-96 overflow-y-auto">
              <Markdown>{readme}</Markdown>
            </div>
            <button className="btn btn-secondary text-xs px-4 py-2" onClick={() => setEditingReadme(true)}>
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit README</span>
            </button>
          </div>
        )}

        {readme && editingReadme && (
          <div className="space-y-3">
            <textarea
              className="input font-mono text-xs leading-relaxed"
              rows={12}
              value={readme}
              onChange={(e) => setReadme(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button className="btn btn-secondary text-xs px-4 py-2" onClick={() => setEditingReadme(false)} disabled={savingReadme}>
                Cancel
              </button>
              <button className="btn btn-primary text-xs px-5 py-2" onClick={saveReadmeEdit} disabled={savingReadme}>
                <Save className="w-3.5 h-3.5" />
                <span>{savingReadme ? "Saving..." : "Save Changes"}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}