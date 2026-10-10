import React, { useEffect, useState, useMemo, useRef } from "react";
import toast from "react-hot-toast";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import ShareToggle from "./ShareToggle.jsx";
import { Paperclip, Copy, Trash2, Eye, EyeOff, ShieldCheck, AlertTriangle, MessageSquare, Send } from "lucide-react";

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,400;1,9..144,500&display=swap');

.dc-serif { font-family: 'Fraunces', Georgia, serif; font-weight: 500; letter-spacing: -0.025em; }

@keyframes dcIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes dcFade { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
@keyframes dcShimmer { from { background-position: -200% 0; } to { background-position: 200% 0; } }
.dc-msg { animation: dcIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) backwards; }
.dc-fade { animation: dcFade 0.3s cubic-bezier(0.16, 1, 0.3, 1) both; }
.dc-shimmer {
  background: linear-gradient(90deg, #f1ece4 0%, #f6dccb 50%, #f1ece4 100%);
  background-size: 200% 100%;
  animation: dcShimmer 1.6s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
`;

const TEAM_TINTS = [
  { bg: "#dcebe2", ink: "#3f6e5b" },
  { bg: "#f7ecc9", ink: "#8a6418" },
  { bg: "#efe6f0", ink: "#6e4a78" },
  { bg: "#e4eef7", ink: "#3d6584" },
];

const initialsOf = (name = "") => name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";

const stamp = (d) =>
  new Date(d).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

// Renders comment text with @mentions highlighted
function renderWithMentions(text) {
  const parts = text.split(/(@[\w.+-]+@[\w.-]+\.\w+)/g);
  return parts.map((part, i) =>
    part.startsWith("@") ? (
      <span key={i} className="text-[#3f6e5b] font-semibold">
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
  const [filter, setFilter] = useState("all"); // all | client | team (view only)
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
    return mentionable.filter((m) => m.email.toLowerCase().includes(q) || m.name.toLowerCase().includes(q));
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

  const clientCount = comments.filter((c) => !c.author).length;
  const teamCount = comments.length - clientCount;
  const visible = comments.filter((c) => filter === "all" || (filter === "client" ? !c.author : Boolean(c.author)));

  const filterChips = [
    { id: "all", label: "All", count: comments.length },
    { id: "client", label: "Client", count: clientCount },
    { id: "team", label: "Team", count: teamCount },
  ];

  return (
    <div className="relative rounded-[32px] bg-[#ffffff] border border-[#e8e2d9] overflow-hidden shadow-[0_30px_70px_-45px_rgba(60,40,20,0.35)]">
      <style>{STYLES}</style>

      {/* Header */}
      <div className="px-7 md:px-9 pt-8 pb-6 flex flex-wrap items-end justify-between gap-5 border-b border-[#e8e2d9]">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#c4673f]">Conversation</p>
          <h4 className="dc-serif text-4xl md:text-5xl mt-2 leading-tight">Discussion</h4>
          <p className="mt-3 text-sm text-[#6b655e] max-w-xl leading-relaxed">
            Team notes stay internal until you share them. Client messages arrive here automatically. Type @ to mention someone.
          </p>
        </div>
        <div className="inline-flex p-1 rounded-full bg-[#f1ece4]">
          {filterChips.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-300 ${
                filter === f.id ? "bg-[#1c1917] text-[#faf7f2]" : "text-[#6b655e] hover:text-[#1c1917]"
              }`}
            >
              {f.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${filter === f.id ? "bg-[#faf7f2]/20" : "bg-[#e8e2d9]"}`}>{f.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Thread */}
      <div className="px-6 md:px-9 py-7 space-y-6 max-h-[38rem] overflow-y-auto">
        {loading ? (
          <div className="space-y-4" aria-busy="true">
            <div className="dc-shimmer h-28 rounded-[24px]" />
            <div className="dc-shimmer h-24 rounded-[24px]" />
          </div>
        ) : comments.length === 0 ? (
          <div className="rounded-[28px] border-2 border-dashed border-[#d9d1c4] p-12 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#f6dccb] flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-[#a4502d]" />
            </div>
            <p className="dc-serif text-3xl mt-6">The conversation starts here</p>
            <p className="mt-2 text-sm text-[#6b655e]">Post an update, or wait for your client's first message.</p>
          </div>
        ) : visible.length === 0 ? (
          <p className="text-center text-sm text-[#6b655e] py-10">No {filter} messages yet.</p>
        ) : (
          visible.map((c, i) => {
            const fromClient = !c.author;
            const outOfScope = fromClient && c.scopeVerdict === "out of scope";
            const inScope = fromClient && c.scopeVerdict === "in scope";
            const canDelete = c.author?._id === user?._id || isProjectOwner;
            const tint = TEAM_TINTS[i % TEAM_TINTS.length];
            const name = c.author?.name || c.authorName || "Client";

            return (
              <article key={c._id} className="dc-msg flex gap-4" style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}>
                {/* Avatar */}
                <span
                  className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 dc-serif text-base ring-4 ring-[#faf7f2]"
                  style={fromClient ? { background: "#f6dccb", color: "#a4502d" } : { background: tint.bg, color: tint.ink }}
                >
                  {fromClient ? "C" : initialsOf(name)}
                </span>

                <div className={`min-w-0 flex-1 rounded-[24px] p-5 md:p-6 border ${fromClient ? "bg-[#fdf6f1] border-[#f6dccb]" : "bg-[#ffffff] border-[#e8e2d9]"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                      <span className="dc-serif text-lg leading-none">{name}</span>
                      {fromClient ? (
                        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#f6dccb] text-[#a4502d]">Client</span>
                      ) : c.isShared ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#dcebe2] text-[#3f6e5b]">
                          <Eye className="w-3 h-3" /> Shared
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#f1ece4] text-[#6b655e]">
                          <EyeOff className="w-3 h-3" /> Internal
                        </span>
                      )}
                      <span className="text-[11px] text-[#a39c92]">{stamp(c.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {!fromClient && <ShareToggle shared={Boolean(c.isShared)} onChange={canShare ? (next) => handleShare(c, next) : undefined} />}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(c._id)}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[#a39c92] hover:bg-[#f9e1d6] hover:text-[#b4475a] transition-colors"
                          aria-label="Delete message"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="mt-3 text-[15px] leading-relaxed text-[#2b2620] whitespace-pre-wrap">{renderWithMentions(c.content)}</p>

                  {c.attachments?.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {c.attachments.map((att, idx) => (
                        <button
                          key={`${c._id}-${idx}`}
                          type="button"
                          onClick={() => openAttachment(projectId, c._id, idx)}
                          className="inline-flex items-center gap-2 text-xs font-semibold bg-[#faf7f2] border border-[#e8e2d9] rounded-xl px-3 py-2 hover:border-[#c4673f] hover:text-[#a4502d] transition-colors"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                          {att.originalName}
                        </button>
                      ))}
                    </div>
                  )}

                  {outOfScope && (
                    <div className="mt-5 rounded-[20px] bg-[#f7ecc9]/70 border border-[#efd9a0] p-5">
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-semibold text-[#8a6418]">
                        <AlertTriangle className="w-3.5 h-3.5" /> Possible scope creep
                      </div>
                      {c.scopeReason && <p className="mt-2 text-sm text-[#5c3f0d] leading-relaxed">{c.scopeReason}</p>}
                      {c.scopeSuggestedReply && (
                        <div className="mt-4 rounded-2xl bg-[#ffffff] border border-[#efd9a0] p-4">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[11px] uppercase tracking-wider text-[#8a6418] font-semibold">Suggested reply</span>
                            <button
                              type="button"
                              onClick={() => copyReply(c.scopeSuggestedReply)}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#a4502d] hover:text-[#1c1917] transition-colors"
                            >
                              <Copy className="w-3.5 h-3.5" /> Copy reply
                            </button>
                          </div>
                          <p className="dc-serif italic text-lg leading-snug mt-2 text-[#2b2620] whitespace-pre-wrap">{c.scopeSuggestedReply}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {inScope && (
                    <p className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#3f6e5b]">
                      <ShieldCheck className="w-3.5 h-3.5" /> Looks within the agreed scope
                    </p>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* Composer */}
      <div className="relative px-6 md:px-9 py-6 bg-[#faf7f2] border-t border-[#e8e2d9]">
        {showMentions && filteredMentions.length > 0 && (
          <div className="dc-fade absolute bottom-full mb-2 left-6 md:left-9 w-full max-w-sm rounded-[20px] bg-[#ffffff] border border-[#e8e2d9] shadow-[0_24px_50px_-24px_rgba(60,40,20,0.4)] overflow-hidden z-10">
            <p className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-wider text-[#a39c92]">Mention a member</p>
            <div className="max-h-56 overflow-y-auto pb-1">
              {filteredMentions.map((m) => (
                <button
                  key={m.email}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectMention(m.email);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[#faf7f2] transition-colors"
                >
                  <span className="w-8 h-8 rounded-full bg-[#f6dccb] text-[#a4502d] text-[11px] font-bold flex items-center justify-center shrink-0">
                    {initialsOf(m.name)}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold truncate">{m.name}</span>
                    <span className="block text-[11px] text-[#a39c92] truncate">
                      {m.email} · {m.role}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handlePost} className="flex items-center gap-3 rounded-[24px] bg-[#ffffff] border border-[#e8e2d9] p-2 pl-5 focus-within:border-[#c4673f] focus-within:ring-2 focus-within:ring-[#f6dccb] transition-all">
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-sm placeholder-[#a39c92] focus:outline-none py-2"
            placeholder="Write a comment... use @ to mention a member"
            value={text}
            onChange={handleTextChange}
            onBlur={() => setTimeout(() => setShowMentions(false), 150)}
          />
          <button
            disabled={posting || !text.trim()}
            className="inline-flex items-center gap-2 text-sm font-semibold bg-[#1c1917] text-[#faf7f2] px-5 py-2.5 rounded-full hover:bg-[#c4673f] transition-colors disabled:opacity-40"
          >
            <Send className="w-3.5 h-3.5" />
            {posting ? "Posting…" : "Post"}
          </button>
        </form>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          {canShare ? (
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex p-1 rounded-full bg-[#f1ece4]">
                {[
                  { value: false, label: "Team only", icon: EyeOff, active: "bg-[#1c1917] text-[#faf7f2]" },
                  { value: true, label: "Share with client", icon: Eye, active: "bg-[#3f6e5b] text-[#faf7f2]" },
                ].map((o) => (
                  <button
                    key={o.label}
                    type="button"
                    onClick={() => setShareOnPost(o.value)}
                    aria-pressed={shareOnPost === o.value}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-300 ${
                      shareOnPost === o.value ? o.active : "text-[#6b655e] hover:text-[#1c1917]"
                    }`}
                  >
                    <o.icon className="w-3.5 h-3.5" />
                    {o.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-[#6b655e]">
                {shareOnPost
                  ? lastFromClient
                    ? "You're replying to your client, so they will see this in their portal."
                    : "Your client will see this in their portal."
                  : "Only you and your team can see this."}
              </p>
            </div>
          ) : (
            <span className="text-xs text-[#a39c92]">Your comments are visible to your team.</span>
          )}
          <span className="text-[11px] text-[#a39c92]">Enter to post</span>
        </div>
      </div>
    </div>
  );
}