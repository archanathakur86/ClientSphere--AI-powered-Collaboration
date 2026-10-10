import React, { useEffect, useState, useMemo, useRef } from "react";
import toast from "react-hot-toast";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import ShareToggle from "./ShareToggle.jsx";
import { MessageSquare, Send, AtSign, AlertTriangle, CheckCircle2, Copy, Trash2, User } from "lucide-react";

// Renders comment text with @mentions highlighted in brand color
function renderWithMentions(text) {
  const parts = text.split(/(@[\w.+-]+@[\w.-]+\.\w+)/g);
  return parts.map((part, i) =>
    part.startsWith("@") ? (
      <span key={i} className="text-indigo-400 font-semibold bg-indigo-500/10 px-1.5 py-0.5 rounded">
        {part}
      </span>
    ) : (
      part
    )
  );
}

// Downloads an attachment through the API (needs the signed-in session), opening it in a new tab.
const openAttachment = async (projectId, commentId, index) => {
  const win = window.open("", "_blank");
  try {
    const res = await api.get(`/projects/${projectId}/comments/${commentId}/attachments/${index}`, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    if (win) win.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch {
    if (win) win.close();
    toast.error("Couldn't open this attachment");
  }
};

export default function CommentsPanel({ projectId, project, canShare = false }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
    // null = not touched yet, so the default follows the conversation (share replies to a client's message)
  const [shareOverride, setShareOverride] = useState(null);
  const setShareOnPost = (value) => setShareOverride(value);
  const lastFromClient = comments.length > 0 && !comments[comments.length - 1].author;
  const shareOnPost = shareOverride ?? lastFromClient;
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
      setShareOverride(null);
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
      toast.success("Reply copied to clipboard");
    } catch {
      toast.error("Couldn't copy automatically");
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/comments/${id}`);
      setComments((prev) => prev.filter((c) => c._id !== id));
      toast.success("Comment deleted");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete comment");
    }
  };

  return (
    <div className="card p-6 space-y-5">
      <div className="flex items-center justify-between border-b border-slate-800 dark:border-slate-800 light:border-slate-200 pb-3">
        <div>
          <h4 className="font-bold text-base text-white dark:text-white light:text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-400" />
            <span>Project Discussion & Feedback</span>
          </h4>
          <p className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-500 mt-0.5">
            Internal team comments & live client messages. Type @ to mention members.
          </p>
        </div>
        <span className="badge bg-slate-800 text-slate-300 border-slate-700">
          {comments.length} message{comments.length === 1 ? "" : "s"}
        </span>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-400">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs">Loading thread...</p>
        </div>
      ) : comments.length === 0 ? (
        <div className="p-8 text-center text-slate-400 space-y-2">
          <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center mx-auto">
            <MessageSquare className="w-5 h-5" />
          </div>
          <p className="text-xs">No comments yet. Start the project conversation below.</p>
        </div>
      ) : (
        <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1">
          {comments.map((c) => {
            const fromClient = !c.author;
            const outOfScope = fromClient && c.scopeVerdict === "out of scope";
            const inScope = fromClient && c.scopeVerdict === "in scope";
            const canDelete = c.author?._id === user?._id || isProjectOwner;
            const authorName = c.author?.name || c.authorName || "Client";

            return (
              <div
                key={c._id}
                className={`rounded-2xl p-4 border transition-all ${
                  fromClient
                    ? "bg-indigo-500/10 border-indigo-500/30"
                    : "bg-slate-950/60 dark:bg-slate-950/60 light:bg-slate-50 border-slate-800/80 dark:border-slate-800/80 light:border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-xs flex-shrink-0">
                      {authorName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-white dark:text-white light:text-slate-900">{authorName}</span>
                        {fromClient && (
                          <span className="badge bg-indigo-500/20 text-indigo-300 border-indigo-500/40 text-[10px]">Client</span>
                        )}
                        <span className="text-[11px] text-slate-400 dark:text-slate-400 light:text-slate-500">
                          {new Date(c.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-xs text-slate-200 dark:text-slate-200 light:text-slate-800 leading-relaxed whitespace-pre-wrap">
                        {renderWithMentions(c.content)}
                                            {c.attachments?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {c.attachments.map((att, idx) => (
                          <button
                            key={`${c._id}-${idx}`}
                            type="button"
                            onClick={() => openAttachment(projectId, c._id, idx)}
                            className="text-xs bg-slate-900 border border-slate-700 px-2.5 py-1 rounded-lg hover:bg-slate-800 text-indigo-300"
                          >
                            Attachment: {att.originalName}
                          </button>
                        ))}
                      </div>
                    )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!fromClient && (
                      <ShareToggle shared={Boolean(c.isShared)} onChange={canShare ? (next) => handleShare(c, next) : undefined} />
                    )}
                    {canDelete && (
                      <button onClick={() => handleDelete(c._id)} className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-rose-500/10" title="Delete Comment">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {outOfScope && (
                  <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs space-y-2 animate-fadeIn">
                    <div className="text-[11px] uppercase tracking-wider font-bold text-amber-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400" /> Possible Scope Creep Detected
                    </div>
                    {c.scopeReason && <p className="text-amber-200 leading-relaxed">{c.scopeReason}</p>}
                    {c.scopeSuggestedReply && (
                      <div className="bg-slate-950/60 p-3 rounded-lg border border-amber-500/20 space-y-1.5">
                        <div className="text-[11px] font-semibold text-slate-400">Suggested AI Reply:</div>
                        <p className="italic text-slate-200 whitespace-pre-wrap">{c.scopeSuggestedReply}</p>
                        <button
                          type="button"
                          onClick={() => copyReply(c.scopeSuggestedReply)}
                          className="btn btn-secondary text-[11px] py-1 px-2.5 inline-flex items-center gap-1 text-indigo-300"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy Reply</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {inScope && (
                  <p className="mt-2 text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Request verified within agreed scope
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Comment Form */}
      <form onSubmit={handlePost} className="space-y-3 pt-2">
        <div className="relative">
          <input
            ref={inputRef}
            className="input text-xs"
            placeholder="Write a comment... use @ to mention team members"
            value={text}
            onChange={handleTextChange}
            onBlur={() => setTimeout(() => setShowMentions(false), 150)}
          />

          {showMentions && filteredMentions.length > 0 && (
            <div className="absolute bottom-full mb-2 left-0 w-full max-w-xs bg-slate-900 border border-slate-800 rounded-xl shadow-xl max-h-48 overflow-y-auto z-30 divide-y divide-slate-800">
              {filteredMentions.map((m) => (
                <button
                  key={m.email}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectMention(m.email);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800 text-xs flex flex-col transition-colors"
                >
                  <span className="font-bold text-white">{m.name}</span>
                  <span className="text-[10px] text-slate-400">
                    {m.email} · {m.role}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          {canShare ? (
            <label className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-400 light:text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={shareOnPost}
                onChange={(e) => setShareOnPost(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500"
              />
              <span>Also publish to client portal</span>
            </label>
          ) : (
            <div />
          )}

          <button className="btn btn-primary text-xs px-5 py-2" disabled={posting}>
            <Send className="w-3.5 h-3.5" />
            <span>{posting ? "Posting..." : "Post Comment"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}