import React, { useState } from "react";
import toast from "react-hot-toast";
import api from "../api/axios.js";
import Markdown from "./Markdown.jsx";
import WeeklyUpdateCard from "./WeeklyUpdateCard.jsx";
import { FileText, Pencil, Check, X, RefreshCw } from "lucide-react";

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,400;1,9..144,500&display=swap');

.rg-serif { font-family: 'Fraunces', Georgia, serif; font-weight: 500; letter-spacing: -0.025em; }

@keyframes rgIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
.rg-in { animation: rgIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }

.rg-md p { margin: 0.5em 0; line-height: 1.8; color: #3a342e; }
.rg-md h1, .rg-md h2, .rg-md h3 { font-family: 'Fraunces', Georgia, serif; color: #1c1917; margin: 1em 0 0.4em; line-height: 1.2; }
.rg-md h1 { font-size: 1.7rem; }
.rg-md h2 { font-size: 1.35rem; }
.rg-md h3 { font-size: 1.1rem; }
.rg-md ul { list-style: disc; padding-left: 1.25em; margin: 0.5em 0; }
.rg-md ol { list-style: decimal; padding-left: 1.25em; margin: 0.5em 0; }
.rg-md li { margin: 0.25em 0; }
.rg-md code { background: #f4efe7; padding: 0.1em 0.4em; border-radius: 6px; font-size: 0.9em; }
.rg-md pre { background: #1c1917; color: #faf7f2; padding: 1rem; border-radius: 16px; overflow-x: auto; margin: 0.8em 0; }
.rg-md pre code { background: none; padding: 0; color: inherit; }
.rg-md blockquote { border-left: 3px solid #c4673f; padding-left: 1em; color: #6b655e; font-style: italic; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
`;

const btnPrimary =
  "inline-flex items-center gap-2 text-sm font-semibold bg-[#1c1917] text-[#faf7f2] px-5 py-2.5 rounded-full hover:bg-[#c4673f] transition-colors disabled:opacity-50 whitespace-nowrap";
const btnGhost =
  "inline-flex items-center gap-2 text-sm font-semibold border border-[#e8e2d9] bg-[#ffffff] text-[#1c1917] px-5 py-2.5 rounded-full hover:border-[#1c1917] transition-colors disabled:opacity-50 whitespace-nowrap";

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
    <div className="space-y-8">
      <style>{STYLES}</style>

      <WeeklyUpdateCard projectId={projectId} project={project} />

      <div className="rg-in rounded-[32px] bg-[#ffffff] border border-[#e8e2d9] p-7 md:p-9">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-start gap-4 max-w-2xl">
            <span className="w-11 h-11 rounded-2xl bg-[#dcebe2] flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-[#3f6e5b]" />
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-[#3f6e5b]">Documentation</p>
              <h4 className="rg-serif text-3xl mt-2 leading-tight">Project README</h4>
              <p className="mt-2 text-sm text-[#6b655e] leading-relaxed">
                Scans your project's files and notes to draft a professional README you can share with the team or the client.
              </p>
            </div>
          </div>
          <button className={btnPrimary} onClick={generateReadme} disabled={loadingReadme || readmeGeneratedOnce}>
            {loadingReadme ? "Writing…" : readmeGeneratedOnce ? "Generated ✓" : "Generate README"}
          </button>
        </div>

        {readmeGeneratedOnce && (
          <button
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#c4673f] hover:text-[#1c1917] transition-colors"
            onClick={() => setReadmeGeneratedOnce(false)}
          >
            <RefreshCw className="w-3.5 h-3.5" /> Regenerate from scratch
          </button>
        )}

        {readme && !editingReadme && (
          <div className="mt-6 space-y-4">
            <div className="rounded-[24px] bg-[#faf7f2] border border-[#e8e2d9] p-7 md:p-9 max-h-[30rem] overflow-y-auto rg-md">
              <Markdown>{readme}</Markdown>
            </div>
            <button className={btnGhost} onClick={() => setEditingReadme(true)}>
              <Pencil className="w-4 h-4" /> Edit README
            </button>
          </div>
        )}

        {readme && editingReadme && (
          <div className="mt-6 space-y-4">
            <textarea
              className="w-full min-h-[320px] rounded-[24px] bg-[#faf7f2] border border-[#e8e2d9] p-6 font-mono text-sm leading-relaxed focus:outline-none focus:border-[#c4673f] focus:ring-2 focus:ring-[#f6dccb] resize-y"
              rows={14}
              value={readme}
              onChange={(e) => setReadme(e.target.value)}
            />
            <div className="flex gap-2">
              <button className={btnPrimary} onClick={saveReadmeEdit} disabled={savingReadme}>
                <Check className="w-4 h-4" /> {savingReadme ? "Saving…" : "Save changes"}
              </button>
              <button className={btnGhost} onClick={() => setEditingReadme(false)} disabled={savingReadme}>
                <X className="w-4 h-4" /> Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}