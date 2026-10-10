import React, { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import api from "../api/axios.js";
import Markdown from "./Markdown.jsx";
import ShareToggle from "./ShareToggle.jsx";
import {
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Download,
  Trash2,
  FileCode2,
  ImageIcon,
  FileText,
  File,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Loader2,
} from "lucide-react";

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,400;1,9..144,500&display=swap');

.fl-serif { font-family: 'Fraunces', Georgia, serif; font-weight: 500; letter-spacing: -0.02em; }

@keyframes flIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes flFade { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
.fl-card { animation: flIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) backwards; }
.fl-fade { animation: flFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) both; }

.fl-md p { margin: 0.5em 0; line-height: 1.7; color: #3a342e; }
.fl-md h1, .fl-md h2, .fl-md h3 { font-family: 'Fraunces', Georgia, serif; color: #1c1917; margin: 0.8em 0 0.3em; }
.fl-md ul { list-style: disc; padding-left: 1.25em; }
.fl-md ol { list-style: decimal; padding-left: 1.25em; }
.fl-md code { background: #f4efe7; padding: 0.1em 0.4em; border-radius: 6px; font-size: 0.9em; }
.fl-md pre { background: #1c1917; color: #faf7f2; padding: 1rem; border-radius: 16px; overflow-x: auto; }
.fl-md pre code { background: none; padding: 0; color: inherit; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
`;

// Keep in sync with TEXT_EXTENSIONS in backend/services/uploadService.js (minus plain .txt)
const CODE_EXTENSIONS = [
  "js", "jsx", "ts", "tsx", "py", "java", "c", "cpp", "h", "cs", "go", "rs", "rb", "php",
  "sh", "sql", "yml", "yaml", "vue", "md", "json", "html", "css",
];
const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "svg"];
// The browser can display these in a new tab; any other type is downloaded instead
const VIEWABLE_EXTENSIONS = ["pdf", "png", "jpg", "jpeg", "gif", "webp", "txt", ...CODE_EXTENSIONS];

const RISK = {
  high: { label: "High risk", bg: "#f9e1d6", ink: "#a4502d", bar: "#c4673f", width: "90%" },
  medium: { label: "Medium risk", bg: "#f7ecc9", ink: "#8a6418", bar: "#e0a46f", width: "55%" },
  low: { label: "Low risk", bg: "#dcebe2", ink: "#3f6e5b", bar: "#3f6e5b", width: "20%" },
};

const KIND = {
  code: { label: "Code", bg: "#dcebe2", ink: "#3f6e5b" },
  image: { label: "Image", bg: "#f6dccb", ink: "#a4502d" },
  pdf: { label: "PDF", bg: "#efe6f0", ink: "#6e4a78" },
  file: { label: "File", bg: "#f7ecc9", ink: "#8a6418" },
};

const kindOf = (ext) => {
  if (CODE_EXTENSIONS.includes(ext)) return "code";
  if (IMAGE_EXTENSIONS.includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  return "file";
};

const KindIcon = ({ kind, className }) => {
  if (kind === "code") return <FileCode2 className={className} />;
  if (kind === "image") return <ImageIcon className={className} />;
  if (kind === "pdf") return <FileText className={className} />;
  return <File className={className} />;
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

function RiskBadge({ level }) {
  const r = RISK[level] || RISK.medium;
  return (
    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: r.bg, color: r.ink }}>
      {r.label}
    </span>
  );
}

function ReviewPanel({ file, review, reviewing, onRerun }) {
  if (!review) {
    return (
      <div className="fl-fade mt-5 rounded-2xl bg-[#faf7f2] border border-[#e8e2d9] p-5 flex items-center gap-3 text-sm text-[#6b655e]">
        <Loader2 className="w-4 h-4 animate-spin text-[#c4673f]" />
        {file.version > 1 ? `AI is comparing v${file.version} with the previous version…` : "AI is reviewing this file…"}
      </div>
    );
  }

  const compared = review.comparedWithVersion;
  const r = RISK[review.riskLevel] || RISK.medium;

  return (
    <div className={`fl-fade mt-5 rounded-[24px] bg-[#faf7f2] border border-[#e8e2d9] p-6 ${reviewing ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="fl-serif text-2xl">AI code review</p>
          <p className="text-xs text-[#6b655e] mt-1">
            {compared
              ? `v${file.version} compared with v${compared} · +${review.addedLines} −${review.removedLines} lines`
              : `v${file.version} · first version, so the whole file was reviewed`}
          </p>
        </div>
        <RiskBadge level={review.riskLevel} />
      </div>

      {/* Risk meter */}
      <div className="mt-5 h-2 rounded-full bg-[#efe9df] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: r.width, background: r.bar }}
        />
      </div>

      <div className="mt-6 grid md:grid-cols-2 gap-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#6b655e] mb-2">Summary</p>
          <p className="text-sm text-[#3a342e] leading-relaxed">{review.summary}</p>

          <p className="text-[11px] uppercase tracking-[0.2em] text-[#6b655e] mt-6 mb-2">Suggestions</p>
          {review.suggestions.length === 0 ? (
            <p className="text-sm text-[#6b655e]">Nothing to add.</p>
          ) : (
            <ul className="space-y-2">
              {review.suggestions.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm text-[#3a342e] leading-relaxed">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#c4673f] shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#6b655e] mb-2">Risks</p>
          {review.risks.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-[#3f6e5b] font-medium">
              <ShieldCheck className="w-4 h-4" /> No significant risks found
            </p>
          ) : (
            <ul className="space-y-3">
              {review.risks.map((risk, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-0.5 shrink-0">
                    <RiskBadge level={risk.severity} />
                  </span>
                  <span className="text-sm text-[#3a342e] leading-relaxed">{risk.description}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {review.truncated && (
        <p className="mt-5 flex items-center gap-2 text-xs text-[#8a6418]">
          <AlertTriangle className="w-3.5 h-3.5" /> This file/diff was very long, so only the first part could be reviewed.
        </p>
      )}

      <div className="mt-6 pt-4 border-t border-[#e8e2d9] flex items-center justify-between gap-3 text-xs text-[#6b655e]">
        <span>{review.generatedAt ? `Reviewed ${new Date(review.generatedAt).toLocaleString()}` : ""}</span>
        <button
          onClick={onRerun}
          disabled={reviewing}
          className="inline-flex items-center gap-1.5 font-semibold text-[#c4673f] hover:text-[#1c1917] transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${reviewing ? "animate-spin" : ""}`} />
          {reviewing ? "Re-running…" : "Re-run review"}
        </button>
      </div>
    </div>
  );
}

function FileCard({ file, index, projectId, canEdit, onDeleted, onUpdated }) {
  const [explanation, setExplanation] = useState(null);
  const [explaining, setExplaining] = useState(false);
  const [review, setReview] = useState(file.review || null);
  const [showReview, setShowReview] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [opening, setOpening] = useState(false);
  const [expandedExplain, setExpandedExplain] = useState(true);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const autoReviewStarted = useRef(false);

  const kind = kindOf(file.fileType);
  const k = KIND[kind];
  const isCode = kind === "code";
  const isImage = kind === "image";

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
      if (!review) setShowReview(false); // nothing to show; a failed re-run keeps the old review visible
    } finally {
      setReviewing(false);
    }
  };

  // Uploading a new version of a code file kicks off the AI review straight away.
  // The ref guard keeps React StrictMode's double-mount from firing it twice in dev.
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

  // Files are fetched through our API (not the raw Cloudinary URL), so PDFs still open
  // when Cloudinary blocks public PDF delivery, and only project members can read them.
  const openFile = async () => {
    if (opening) return;
    const viewable = VIEWABLE_EXTENSIONS.includes(file.fileType);
    // The tab must be opened inside the click handler, before the await, or popup blockers stop it
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
    try {
      await api.delete(`/files/${file._id}`);
      toast.success("File deleted");
      onDeleted(file._id);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete file");
    } finally {
      setConfirmingDelete(false);
    }
  };

  const viewable = VIEWABLE_EXTENSIONS.includes(file.fileType);

  return (
    <article
      className="fl-card group relative rounded-[28px] bg-[#ffffff] border border-[#e8e2d9] p-6 md:p-7 hover:shadow-[0_28px_60px_-34px_rgba(60,40,20,0.35)] transition-shadow duration-500"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="flex items-start gap-5">
        {/* Type tile */}
        <div
          className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center shrink-0"
          style={{ background: k.bg, color: k.ink }}
        >
          <KindIcon kind={kind} className="w-6 h-6" />
          <span className="text-[9px] font-bold uppercase tracking-wider mt-1">{(file.fileType || "file").slice(0, 4)}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="fl-serif text-2xl leading-tight break-all">{file.originalName}</span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#f1ece4] text-[#1c1917]">v{file.version}</span>
          </div>
          <p className="text-xs text-[#6b655e] mt-1.5">
            {file.uploader?.name || "Unknown"} · {new Date(file.createdAt).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <ShareToggle shared={Boolean(file.isShared)} onChange={canEdit && onUpdated ? handleShare : undefined} />
        </div>
      </div>

      {isImage && (
        <div className="mt-5 rounded-2xl overflow-hidden bg-[#faf7f2] border border-[#e8e2d9] flex items-center justify-center max-h-56">
          <img src={file.url} alt={file.originalName} className="max-h-56 object-contain" />
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 mt-5">
        <button
          onClick={openFile}
          disabled={opening}
          className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#1c1917] text-[#faf7f2] px-4 py-2 rounded-full hover:bg-[#c4673f] transition-colors disabled:opacity-50"
          title={viewable ? "Open in a new tab" : "Download"}
        >
          {viewable ? <ExternalLink className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
          {opening ? "Opening…" : viewable ? "Open" : "Download"}
        </button>

        {isCode && (
          <>
            <button
              onClick={runExplain}
              disabled={explaining}
              className="inline-flex items-center gap-1.5 text-xs font-semibold border border-[#e8e2d9] bg-[#ffffff] px-4 py-2 rounded-full hover:border-[#c4673f] hover:text-[#a4502d] transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {explaining ? "Explaining…" : "Explain code"}
            </button>
            <button
              onClick={handleReviewClick}
              disabled={reviewing && !review}
              className="inline-flex items-center gap-1.5 text-xs font-semibold border border-[#e8e2d9] bg-[#ffffff] px-4 py-2 rounded-full hover:border-[#c4673f] hover:text-[#a4502d] transition-colors disabled:opacity-50"
            >
              {reviewing && !review ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldAlert className="w-3.5 h-3.5" />}
              {reviewing && !review
                ? "Reviewing…"
                : review
                ? showReview
                  ? "Hide review"
                  : "View review"
                : "AI review"}
            </button>
          </>
        )}

        {canEdit && (
          <button
            onClick={() => setConfirmingDelete(true)}
            className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-[#b4475a] px-3 py-2 rounded-full hover:bg-[#f9e1d6] transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        )}
      </div>
            {confirmingDelete && (
        <div className="fl-fade mt-5 rounded-2xl bg-[#f9e1d6]/60 border border-[#f2c9b8] p-4 flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm text-[#a4502d]">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Delete "<span className="font-semibold">{file.originalName}</span>"? This can't be undone.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              className="text-xs font-semibold bg-[#b4475a] text-[#faf7f2] px-4 py-2 rounded-full hover:bg-[#8f3346] transition-colors"
            >
              Delete
            </button>
            <button
              onClick={() => setConfirmingDelete(false)}
              className="text-xs font-semibold border border-[#e8e2d9] bg-[#ffffff] px-4 py-2 rounded-full hover:border-[#1c1917] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showReview && <ReviewPanel file={file} review={review} reviewing={reviewing} onRerun={() => runReview({ regenerate: true })} />}

      {explanation && (
        <div className="fl-fade mt-5 rounded-[24px] bg-[#faf7f2] border border-[#e8e2d9] p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="fl-serif text-2xl" style={{ color: k.ink }}>
              Code explanation
            </p>
            <button
              onClick={() => setExpandedExplain((e) => !e)}
              className="w-8 h-8 rounded-full hover:bg-[#f1ece4] flex items-center justify-center"
              aria-label={expandedExplain ? "Collapse" : "Expand"}
            >
              {expandedExplain ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
          {expandedExplain && (
            <div className="fl-md mt-3 text-sm">
              <Markdown>{explanation}</Markdown>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export default function FileList({ files, projectId, canEdit = true, onUpdated, onDeleted }) {
  if (files.length === 0) {
    return (
      <div className="rounded-[32px] border-2 border-dashed border-[#d9d1c4] bg-[#ffffff] p-14 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-[#dcebe2] flex items-center justify-center">
          <File className="w-7 h-7 text-[#3f6e5b]" />
        </div>
        <h3 className="fl-serif text-4xl mt-7">Nothing in the vault yet</h3>
        <p className="mt-3 text-sm text-[#6b655e] max-w-md mx-auto leading-relaxed">
          Files stay internal until you share them with the client.
        </p>
      </div>
    );
  }

  const shared = files.filter((f) => f.isShared).length;

  return (
    <div className="space-y-6">
      <style>{STYLES}</style>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#6b655e]">Vault</p>
          <p className="fl-serif text-4xl mt-2">
            {files.length} file{files.length === 1 ? "" : "s"}
          </p>
        </div>
        <p className="text-xs text-[#6b655e]">
          {shared} shared with the client · {files.length - shared} internal
        </p>
      </div>
      <div className="grid md:grid-cols-2 gap-6 items-start">
        {files.map((f, i) => (
          <FileCard
            key={f._id}
            file={f}
            index={i}
            projectId={projectId}
            canEdit={canEdit}
            onUpdated={onUpdated}
            onDeleted={onDeleted}
          />
        ))}
      </div>
    </div>
  );
}