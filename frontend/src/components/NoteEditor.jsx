import React, { useState } from "react";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Save, Eye, PenLine, Heading2, List, ListChecks, Quote, Code2 } from "lucide-react";

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,400;1,9..144,500&display=swap');

.ne-serif { font-family: 'Fraunces', Georgia, serif; font-weight: 500; letter-spacing: -0.02em; }

@keyframes neIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
.ne-in { animation: neIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }

.ne-md p { margin: 0.5em 0; line-height: 1.75; color: #3a342e; }
.ne-md h1, .ne-md h2, .ne-md h3 { font-family: 'Fraunces', Georgia, serif; color: #1c1917; margin: 0.9em 0 0.4em; line-height: 1.2; }
.ne-md h1 { font-size: 1.6rem; }
.ne-md h2 { font-size: 1.3rem; }
.ne-md h3 { font-size: 1.1rem; }
.ne-md ul { list-style: disc; padding-left: 1.25em; margin: 0.5em 0; }
.ne-md ol { list-style: decimal; padding-left: 1.25em; margin: 0.5em 0; }
.ne-md li { margin: 0.2em 0; }
.ne-md code { background: #f4efe7; padding: 0.1em 0.4em; border-radius: 6px; font-size: 0.9em; }
.ne-md pre { background: #1c1917; color: #faf7f2; padding: 1rem; border-radius: 16px; overflow-x: auto; margin: 0.8em 0; }
.ne-md pre code { background: none; padding: 0; color: inherit; }
.ne-md blockquote { border-left: 3px solid #c4673f; padding-left: 1em; color: #6b655e; margin: 0.8em 0; font-style: italic; }
.ne-md strong { color: #1c1917; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
`;

const TOOLS = [
  { label: "Heading", icon: Heading2, snippet: "## " },
  { label: "Bullets", icon: List, snippet: "- " },
  { label: "Checklist", icon: ListChecks, snippet: "- [ ] " },
  { label: "Quote", icon: Quote, snippet: "> " },
  { label: "Code", icon: Code2, snippet: "```\n\n```" },
];

export default function NoteEditor({ projectId, onCreated }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [titleError, setTitleError] = useState(false);
  const [contentError, setContentError] = useState(false);
  const { user } = useAuth();

  const handleSave = async () => {
    if (!title.trim()) {
      setTitleError(true);
      toast.error("Title is required");
      return;
    }
    if (!content.trim()) {
      setContentError(true);
      toast.error("Content is required");
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
      setPreview(false);
      // The create response is not populated, so attach the signed-in author here.
      const note = res.data.note;
      onCreated({
        ...note,
        author: note.author?.name ? note.author : { _id: user?._id, name: user?.name },
      });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save note");
    } finally {
      setSaving(false);
    }
  };

  const insert = (snippet) => {
    setPreview(false);
    setContent((c) => (c && !c.endsWith("\n") ? `${c}\n${snippet}` : `${c}${snippet}`));
  };

  const words = content.trim() ? content.trim().split(/\s+/).length : 0;

  return (
    <div className="ne-in relative rounded-[32px] bg-[#ffffff] border border-[#e8e2d9] shadow-[0_30px_70px_-45px_rgba(60,40,20,0.35)] overflow-hidden">
      <style>{STYLES}</style>
      <span className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#f6dccb] via-[#f7ecc9] to-[#dcebe2]" />

      <div className="px-8 pt-9">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[#c4673f]">New note</p>
        <input
          className={`ne-serif w-full mt-3 text-4xl md:text-5xl bg-transparent placeholder-[#c9c1b5] focus:outline-none ${
            titleError ? "text-[#b4475a]" : ""
          }`}
          placeholder="Give this thought a title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (e.target.value.trim()) setTitleError(false);
          }}
        />
        {titleError && <p className="mt-2 text-xs font-semibold text-[#b4475a]">Title is required before you can save.</p>}
      </div>

      {/* Toolbar */}
      <div className="px-8 mt-6 flex flex-wrap items-center justify-between gap-3 border-y border-[#e8e2d9] py-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {TOOLS.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => insert(t.snippet)}
              disabled={preview}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6b655e] px-3 py-1.5 rounded-full hover:bg-[#f4efe7] hover:text-[#1c1917] transition-colors disabled:opacity-40"
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>
        <div className="inline-flex p-1 rounded-full bg-[#f1ece4]">
          {[
            { id: false, label: "Write", icon: PenLine },
            { id: true, label: "Preview", icon: Eye },
          ].map((m) => (
            <button
              key={m.label}
              type="button"
              onClick={() => setPreview(m.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                preview === m.id ? "bg-[#1c1917] text-[#faf7f2]" : "text-[#6b655e] hover:text-[#1c1917]"
              }`}
            >
              <m.icon className="w-3.5 h-3.5" />
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="px-8 py-6 min-h-[260px] bg-[#faf7f2]/50">
        {preview ? (
          content.trim() ? (
            <div className="ne-md text-[15px]">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-[#a39c92] italic">Nothing to preview yet. Start writing to see it here.</p>
          )
        ) : (
          <textarea
            className={`w-full min-h-[220px] bg-transparent resize-none text-[15px] leading-[1.8] text-[#3a342e] placeholder-[#a39c92] focus:outline-none font-sans ${
              contentError ? "text-[#b4475a]" : ""
            }`}
            placeholder={"Write in markdown.\n\n## Meeting notes\n- Discussed the homepage direction\n- Next step: share two moodboards"}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              if (e.target.value.trim()) setContentError(false);
            }}
          />
        )}
      </div>

      {/* Footer */}
      <div className="px-8 py-5 border-t border-[#e8e2d9] flex flex-wrap items-center justify-between gap-4">
        <p className="text-xs text-[#a39c92]">
          {words} word{words === 1 ? "" : "s"} · Markdown supported · AI tags it on save
          {contentError && <span className="ml-2 font-semibold text-[#b4475a]">Content is required.</span>}
        </p>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 text-sm font-semibold bg-[#1c1917] text-[#faf7f2] px-6 py-3 rounded-full hover:bg-[#c4673f] transition-colors disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving + AI tagging…" : "Save note"}
        </button>
      </div>
    </div>
  );
}