import React, { useEffect, useState, useMemo, useRef } from "react";
import toast from "react-hot-toast";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import ShareToggle from "./ShareToggle.jsx";

// Renders comment text with @mentions highlighted in brand color
function renderWithMentions(text) {
  const parts = text.split(/(@[\w.+-]+@[\w.-]+\.\w+)/g);
  return parts.map((part, i) =>
    part.startsWith("@") ? (
      <span key={i} className="text-indigo-400 font-medium">
        {part}
      </span>
    ) : (
      part
    )
  );
}

export default function CommentsPanel({ projectId, project, canShare = false }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [shareOnPost, setShareOnPost] = useState(false);
  const isProjectOwner = String(project?.owner?._id || project?.owner || "") === String(user?._id || "");

  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStart, setMentionStart] = useState(null);
  const inputRef = useRef(null);

  // Everyone who can be @mentioned: the owner + all invited members
  const mentionable = useMemo(() => {
    if (!project) return [];
    const list = [];
    if (project.owner?.email) list.push({ name: project.owner.name, email: project.owner.email, role: "owner" });
    (project.members || []).forEach((m) => {
      if (m.user?.email) list.push({ name: m.user.name, email: m.user.email, role: m.role });
    });
    return list;
  }, [project]);

  const filteredMentions = useMemo(() => {
    if (!mentionQuery) return mentionable;
    const q = mentionQuery.toLowerCase();
    return mentionable.filter(
      (m) => m.email.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)
    );
  }, [mentionable, mentionQuery]);

  const loadComments = async () => {
    try {
      const res = await api.get(`/projects/${projectId}/comments`);
      setComments(res.data.comments);
    } catch (err) {
      toast.error("Failed to load comments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
  }, [projectId]);

  // Detect "@" being typed to trigger the mention dropdown
  const handleTextChange = (e) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setText(value);

    const uptoCursor = value.slice(0, cursorPos);
    const atMatch = uptoCursor.match(/@([\w.@-]*)$/);

    if (atMatch) {
      setShowMentions(true);
      setMentionQuery(atMatch[1]);
      setMentionStart(cursorPos - atMatch[1].length - 1);
    } else {
      setShowMentions(false);
    }
  };

  const selectMention = (email) => {
    const before = text.slice(0, mentionStart);
    const after = text.slice(inputRef.current.selectionStart);
    const newText = `${before}@${email} ${after}`;
    setText(newText);
    setShowMentions(false);
    // refocus after the inserted mention
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      const pos = before.length + email.length + 2;
      inputRef.current?.setSelectionRange(pos, pos);
    });
  };

  const handlePost = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setPosting(true);
    try {
      const res = await api.post(`/projects/${projectId}/comments`, { content: text, ...(canShare && shareOnPost ? { isShared: true } : {}) });
      setComments((prev) => [...prev, res.data.comment]);
      setText("");
      setShareOnPost(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to post comment");
    } finally {
      setPosting(false);
    }
  };

  const handleShare = async (comment, next) => {
    try {
      await api.patch(`/projects/${projectId}/comments/${comment._id}/visibility`, { isShared: next });
      setComments((prev) => prev.map((c) => (c._id === comment._id ? { ...c, isShared: next } : c)));
      toast.success(next ? "Shared with the client" : "Now internal only");
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't change visibility");
    }
  };

  const copyReply = async (reply) => {
    try {
      await navigator.clipboard.writeText(reply);
      toast.success("Reply copied");
    } catch {
      toast.error("Couldn't copy automatically");
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/comments/${id}`);
      setComments((prev) => prev.filter((c) => c._id !== id));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete comment");
    }
  };

  return (
    <div className="card">
      <h4 className="font-semibold mb-3">Discussion</h4>
      <p className="text-xs text-slate-400 mb-3">
        Comments are internal until you share them. Messages from your client appear here automatically. Type @ to mention someone.
      </p>

      {loading ? (
        <p className="text-sm text-slate-400">Loading comments...</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-slate-400 mb-3">No comments yet. Start the discussion below.</p>
      ) : (
        <div className="space-y-3 mb-4 max-h-80 overflow-y-auto">
          {comments.map((c) => {
            const fromClient = !c.author;
            const outOfScope = fromClient && c.scopeVerdict === "out of scope";
            const inScope = fromClient && c.scopeVerdict === "in scope";
            const canDelete = c.author?._id === user?._id || isProjectOwner;
            return (
              <div key={c._id} className={`rounded-lg p-3 border ${fromClient ? "bg-indigo-500/10 border-indigo-500/20" : "bg-slate-950 border-slate-800"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm flex flex-wrap items-center gap-2">
                      <span className="font-medium">{c.author?.name || c.authorName || "Client"}</span>
                      {fromClient && <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200">Client</span>}
                      <span className="text-xs text-slate-500">{new Date(c.createdAt).toLocaleString()}</span>
                    </p>
                    <p className="text-sm text-slate-300 mt-1 whitespace-pre-wrap">{renderWithMentions(c.content)}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {!fromClient && <ShareToggle shared={Boolean(c.isShared)} onChange={canShare ? (next) => handleShare(c, next) : undefined} />}
                    {canDelete && (
                      <button onClick={() => handleDelete(c._id)} className="text-xs text-red-400 hover:underline">
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                {outOfScope && (
                  <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                    <div className="text-[11px] uppercase tracking-wide font-semibold text-amber-300">Possible scope creep</div>
                    {c.scopeReason && <p className="text-amber-100 mt-1">{c.scopeReason}</p>}
                    {c.scopeSuggestedReply && (
                      <div className="mt-2 text-slate-300">
                        <div className="text-xs text-slate-400 mb-1">Suggested reply</div>
                        <p className="italic whitespace-pre-wrap">{c.scopeSuggestedReply}</p>
                        <button type="button" onClick={() => copyReply(c.scopeSuggestedReply)} className="text-xs text-indigo-300 hover:underline mt-1">
                          Copy reply
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {inScope && <p className="mt-2 text-[11px] text-emerald-300">Looks within the agreed scope</p>}
              </div>
            );
          })}
        </div>
      )}

      <form onSubmit={handlePost} className="flex gap-2 relative">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            className="input text-sm"
            placeholder="Write a comment... use @ to mention a member"
            value={text}
            onChange={handleTextChange}
            onBlur={() => setTimeout(() => setShowMentions(false), 150)}
          />
          {showMentions && filteredMentions.length > 0 && (
            <div className="absolute bottom-full mb-1 left-0 w-full max-w-xs bg-slate-900 border border-slate-800 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
              {filteredMentions.map((m) => (
                <button
                  key={m.email}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectMention(m.email);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800 text-sm flex flex-col"
                >
                  <span className="font-medium">{m.name}</span>
                  <span className="text-xs text-slate-400">
                    {m.email} · {m.role}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button className="btn btn-primary text-sm" disabled={posting}>
          {posting ? "Posting..." : "Post"}
        </button>
      </form>
      {canShare && (
        <label className="flex items-center gap-2 mt-3 text-xs text-slate-400 cursor-pointer select-none">
          <input type="checkbox" checked={shareOnPost} onChange={(e) => setShareOnPost(e.target.checked)} className="accent-indigo-500" />
          Also show this comment to the client in their portal
        </label>
      )}
    </div>
  );
}