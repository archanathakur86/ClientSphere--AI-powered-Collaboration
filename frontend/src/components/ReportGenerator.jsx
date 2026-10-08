import React, { useState } from "react";
import toast from "react-hot-toast";
import api from "../api/axios.js";
import Markdown from "./Markdown.jsx";
import WeeklyUpdateCard from "./WeeklyUpdateCard.jsx";

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
    <div className="space-y-4">
      <WeeklyUpdateCard projectId={projectId} project={project} />

      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold">AI README Generator</h4>
            <p className="text-sm text-slate-400">Scans your project's files and notes to draft a professional README.</p>
          </div>
          <button
            className="btn btn-primary text-sm whitespace-nowrap"
            onClick={generateReadme}
            disabled={loadingReadme || readmeGeneratedOnce}
          >
            {loadingReadme ? "Writing..." : readmeGeneratedOnce ? "Generated ✓" : "Generate README"}
          </button>
        </div>
        {readmeGeneratedOnce && (
          <button className="text-xs text-indigo-400 hover:underline mt-2" onClick={() => setReadmeGeneratedOnce(false)}>
            Regenerate from scratch
          </button>
        )}

        {readme && !editingReadme && (
          <>
            <div className="mt-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4 max-h-96 overflow-y-auto">
              <Markdown>{readme}</Markdown>
            </div>
            <button className="btn btn-secondary text-sm mt-3" onClick={() => setEditingReadme(true)}>
              ✏️ Edit README
            </button>
          </>
        )}

        {readme && editingReadme && (
          <div className="mt-4 space-y-2">
            <textarea
              className="input font-mono text-sm"
              rows={14}
              value={readme}
              onChange={(e) => setReadme(e.target.value)}
            />
            <div className="flex gap-2">
              <button className="btn btn-primary text-sm" onClick={saveReadmeEdit} disabled={savingReadme}>
                {savingReadme ? "Saving..." : "Save Changes"}
              </button>
              <button className="btn btn-secondary text-sm" onClick={() => setEditingReadme(false)} disabled={savingReadme}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}