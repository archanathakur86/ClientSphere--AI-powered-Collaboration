import React, { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import api from "../api/axios.js";
import Markdown from "./Markdown.jsx";
import ShareToggle from "./ShareToggle.jsx";
import { FileText, FileCode, Image as ImageIcon, ExternalLink, Download, Brain, Search, Trash2, ShieldAlert, Sparkles, Layers } from "lucide-react";

// Keep in sync with TEXT_EXTENSIONS in backend/services/uploadService.js (minus plain .txt)
const CODE_EXTENSIONS = [
  "js", "jsx", "ts", "tsx", "py", "java", "c", "cpp", "h", "cs", "go", "rs", "rb", "php",
  "sh", "sql", "yml", "yaml", "vue", "md", "json", "html", "css",
];
const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "svg"];
// The browser can display these in a new tab; any other type is downloaded instead
const VIEWABLE_EXTENSIONS = ["pdf", "png", "jpg", "jpeg", "gif", "webp", "txt", ...CODE_EXTENSIONS];

const RISK_STYLES = {
  high: "bg-rose-500/10 text-rose-400 dark:text-rose-300 light:text-rose-700 border-rose-500/30",
  medium: "bg-amber-500/10 text-amber-400 dark:text-amber-300 light:text-amber-700 border-amber-500/30",
  low: "bg-emerald-500/10 text-emerald-400 dark:text-emerald-300 light:text-emerald-700 border-emerald-500/30",
};

// With responseType "blob", error bodies arrive as a Blob too, so unwrap the JSON message
const readErrorMessage = async (err, fallback) => {
  const data = err.response?.data;
  if (data instanceof Blob) {
    try {
      return JSON.parse(await data.text()).message || fallback;
    } catch {
      return fallback;
    }
  }
  return data?.message || fallback;
};

function RiskPill({ level, children }) {
  return (
    <span className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${RISK_STYLES[level] || RISK_STYLES.medium}`}>
      {children || level}
    </span>
  );
}

function ReviewPanel({ file, review, reviewing, onRerun }) {
  if (!review) {
    return (
      <div className="mt-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 text-xs text-slate-400 flex items-center gap-2">
        <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        <span>{file.version > 1 ? `AI is comparing v${file.version} with previous version...` : "AI is reviewing code structure..."}</span>
      </div>
    );
  }

  const compared = review.comparedWithVersion;
  return (
    <div className={`mt-4 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl p-5 text-xs space-y-3 ${reviewing ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-500/20 pb-3">
        <div className="space-y-0.5">
          <p className="font-bold text-indigo-300 text-sm flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-400" /> AI Code Review
          </p>
          <p className="text-[11px] text-slate-400">
            {compared
              ? `v${file.version} compared with v${compared} · +${review.addedLines} −${review.removedLines} lines`
              : `v${file.version} · initial release version review`}
          </p>
        </div>
        <RiskPill level={review.riskLevel}>Risk: {review.riskLevel}</RiskPill>
      </div>

      <div>
        <p className="font-bold text-white dark:text-white light:text-slate-900 mb-1">Summary</p>
        <p className="text-slate-300 dark:text-slate-300 light:text-slate-700 leading-relaxed">{review.summary}</p>
      </div>

      <div>
        <p className="font-bold text-white dark:text-white light:text-slate-900 mb-1">Identified Risks</p>
        {review.risks.length === 0 ? (
          <p className="text-emerald-400 font-medium">No security or logical risks found ✓</p>
        ) : (
          <ul className="space-y-2">
            {review.risks.map((r, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-0.5 flex-shrink-0">
                  <RiskPill level={r.severity} />
                </span>
                <span className="text-slate-300 dark:text-slate-300 light:text-slate-700 leading-relaxed">{r.description}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <p className="font-bold text-white dark:text-white light:text-slate-900 mb-1">Suggestions</p>
        {review.suggestions.length === 0 ? (
          <p className="text-slate-400">Code meets standards.</p>
        ) : (
          <ul className="list-disc pl-4 space-y-1 text-slate-300 dark:text-slate-300 light:text-slate-700">
            {review.suggestions.map((s, i) => (
              <li key={i} className="leading-relaxed">
                {s}
              </li>
            ))}
          </ul>
        )}
      </div>

      {review.truncated && (
        <p className="text-[11px] text-amber-400">
          Note: This file was truncated due to length limits; partial diff reviewed.
        </p>
      )}

      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-indigo-500/20">
        <span>{review.generatedAt ? `Reviewed ${new Date(review.generatedAt).toLocaleString()}` : ""}</span>
        <button className="text-indigo-400 hover:text-indigo-300 font-semibold disabled:opacity-50" onClick={onRerun} disabled={reviewing}>
          {reviewing ? "Re-running..." : "↻ Re-run AI review"}
        </button>
      </div>
    </div>
  );
}

function FileCard({ file, projectId, canEdit, onDeleted, onUpdated }) {
  const [explanation, setExplanation] = useState(null);
  const [explaining, setExplaining] = useState(false);
  const [review, setReview] = useState(file.review || null);
  const [showReview, setShowReview] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [opening, setOpening] = useState(false);
  const autoReviewStarted = useRef(false);

  const isCode = !!file.fileType && CODE_EXTENSIONS.includes(file.fileType);
  const isImage = IMAGE_EXTENSIONS.includes(file.fileType);

  const runExplain = async () => {
    setExplaining(true);
    try {
      const res = await api.post(`/files/${file._id}/explain`);
      setExplanation(res.data.explanation);
    } catch (err) {
      toast.error(err.response?.data?.message || "AI action failed");
    } finally {
      setExplaining(false);
    }
  };

  const runReview = async ({ regenerate = false } = {}) => {
    setShowReview(true);
    setReviewing(true);
    try {
      const res = await api.post(`/files/${file._id}/review`, { regenerate });
      setReview(res.data.review);
    } catch (err) {
      toast.error(err.response?.data?.message || "AI review failed");
      if (!review) setShowReview(false);
    } finally {
      setReviewing(false);
    }
  };

  useEffect(() => {
    if (file._justUploaded && file.version > 1 && isCode && !review && !autoReviewStarted.current) {
      autoReviewStarted.current = true;
      runReview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReviewClick = () => {
    if (review) setShowReview((s) => !s);
    else runReview();
  };

  const openFile = async () => {
    if (opening) return;
    const viewable = VIEWABLE_EXTENSIONS.includes(file.fileType);
    const tab = viewable ? window.open("", "_blank") : null;
    setOpening(true);
    try {
      const res = await api.get(`/files/${file._id}/download`, { responseType: "blob" });
      const blobUrl = URL.createObjectURL(res.data);
      if (tab) {
        tab.location.href = blobUrl;
      } else {
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = file.originalName;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (err) {
      tab?.close();
      toast.error(await readErrorMessage(err, "Couldn't open this file"));
    } finally {
      setOpening(false);
    }
  };

  const handleShare = async (next) => {
    try {
      await api.patch(`/projects/${projectId}/files/${file._id}/visibility`, { isShared: next });
      onUpdated?.({ ...file, isShared: next });
      toast.success(next ? "Shared with the client" : "Now internal only");
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't change visibility");
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete ${file.originalName}?`)) return;
    try {
      await api.delete(`/files/${file._id}`);
      toast.success("File deleted");
      onDeleted(file._id);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete file");
    }
  };

  return (
    <div className="card p-5 space-y-3 hover:border-slate-700/80 transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            {isCode ? (
              <FileCode className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            ) : isImage ? (
              <ImageIcon className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            ) : (
              <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
            )}
            <button
              type="button"
              onClick={openFile}
              disabled={opening}
              className="font-bold text-sm text-indigo-400 hover:text-indigo-300 truncate text-left flex items-center gap-1.5"
            >
              <span>{opening ? "Opening..." : file.originalName}</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </button>
            <span className="badge bg-slate-800 text-slate-300 border-slate-700">v{file.version}</span>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-500 font-medium">
            Uploaded by {file.uploader?.name} · {new Date(file.createdAt).toLocaleDateString()}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <ShareToggle shared={Boolean(file.isShared)} onChange={canEdit && onUpdated ? handleShare : undefined} />
          {canEdit && (
            <button onClick={handleDelete} className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10" title="Delete File">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {isImage && <img src={file.url} alt={file.originalName} className="mt-2 max-h-48 rounded-xl border border-slate-800 object-cover shadow-sm" />}

      {isCode && (
        <div className="flex flex-wrap gap-2 pt-2">
          <button className="btn btn-secondary text-xs py-1.5 px-3" disabled={explaining} onClick={runExplain}>
            <Brain className="w-3.5 h-3.5 text-indigo-400" />
            <span>{explaining ? "Explaining..." : "Explain Code"}</span>
          </button>
          <button className="btn btn-secondary text-xs py-1.5 px-3" disabled={reviewing && !review} onClick={handleReviewClick}>
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {reviewing && !review
                ? "Reviewing..."
                : review
                ? showReview
                  ? "Hide AI Review"
                  : "View AI Review"
                : "AI Code Review"}
            </span>
          </button>
        </div>
      )}

      {showReview && <ReviewPanel file={file} review={review} reviewing={reviewing} onRerun={() => runReview({ regenerate: true })} />}

      {explanation && (
        <div className="mt-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4 text-xs space-y-2 animate-fadeIn">
          <p className="font-bold text-indigo-300 uppercase tracking-wider">Code Explanation</p>
          <Markdown>{explanation}</Markdown>
        </div>
      )}
    </div>
  );
}

export default function FileList({ files, projectId, canEdit = true, onUpdated, onDeleted }) {
  if (files.length === 0) {
    return (
      <div className="card p-10 text-center text-slate-400 space-y-2">
        <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto">
          <FileText className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-white dark:text-white light:text-slate-900">No files uploaded yet</p>
        <p className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-500 max-w-sm mx-auto">
          Files stay private to project members until you enable client sharing on individual files.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {files.map((f) => (
        <FileCard key={f._id} file={f} projectId={projectId} canEdit={canEdit} onUpdated={onUpdated} onDeleted={onDeleted} />
      ))}
    </div>
  );
}