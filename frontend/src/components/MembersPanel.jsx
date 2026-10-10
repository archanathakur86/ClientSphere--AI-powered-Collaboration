import React, { useState } from "react";
import toast from "react-hot-toast";
import api from "../api/axios.js";
import MemberEmailInput from "./MemberEmailInput.jsx";
import { UserPlus, Globe, Lock, Copy, Check, ExternalLink, AlertTriangle, Pencil, Eye, ShieldCheck } from "lucide-react";

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,400;1,9..144,500&display=swap');

.mp-serif { font-family: 'Fraunces', Georgia, serif; font-weight: 500; letter-spacing: -0.025em; }

@keyframes mpIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes mpFade { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
.mp-in { animation: mpIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
.mp-row { animation: mpIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) backwards; }
.mp-fade { animation: mpFade 0.35s cubic-bezier(0.16, 1, 0.3, 1) both; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
`;

const ROLE = {
  owner: { label: "Owner", tint: "#1c1917", ink: "#faf7f2" },
  editor: { label: "Editor", tint: "#dcebe2", ink: "#3f6e5b" },
  viewer: { label: "Viewer", tint: "#f6dccb", ink: "#a4502d" },
};

const MONOGRAMS = ["#f6dccb", "#dcebe2", "#f7ecc9", "#efe6f0", "#e4eef7"];
const MONO_INK = ["#a4502d", "#3f6e5b", "#8a6418", "#6e4a78", "#3d6584"];

const inputCls =
  "w-full px-4 py-3 bg-[#ffffff] border border-[#e8e2d9] rounded-2xl text-sm placeholder-[#a39c92] focus:outline-none focus:border-[#c4673f] focus:ring-2 focus:ring-[#f6dccb]";

const initialsOf = (name = "") => name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";

export default function MembersPanel({ project, currentUserId, onUpdated }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("editor");
  const [adding, setAdding] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [changingVisibility, setChangingVisibility] = useState(false);

  const copyPublicUrl = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy automatically. Please copy manually");
    }
  };

  const isOwner = project.owner?._id === currentUserId || project.owner === currentUserId;

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!email.trim()) return toast.error("Enter an email");
    setAdding(true);
    try {
      const res = await api.post(`/projects/${project._id}/members`, { email, role });
      toast.success("Member added");
      setEmail("");
      onUpdated(res.data.project);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add member");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (userId) => {
    setRemovingId(userId);
    try {
      const res = await api.delete(`/projects/${project._id}/members/${userId}`);
      toast.success("Member removed");
      onUpdated(res.data.project);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove member");
    } finally {
      setRemovingId(null);
      setConfirmRemoveId(null);
    }
  };

  const toggleVisibility = async () => {
    setChangingVisibility(true);
    try {
      const res = await api.patch(`/projects/${project._id}/visibility`);
      toast.success(res.data.isPublic ? "Project is now public" : "Project is now private");
      onUpdated({ ...project, isPublic: res.data.isPublic, publicSlug: res.data.publicSlug });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to change visibility");
    } finally {
      setChangingVisibility(false);
    }
  };

  const publicUrl = project.publicSlug ? `${window.location.origin}/public/${project.publicSlug}` : "";
  const members = project.members || [];
  const teamSize = members.length + 1;

  return (
    <div className="space-y-8">
      <style>{STYLES}</style>

      {/* Team */}
      <div className="mp-in rounded-[32px] bg-[#ffffff] border border-[#e8e2d9] p-7 md:p-9 shadow-[0_30px_70px_-45px_rgba(60,40,20,0.35)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#c4673f]">Team</p>
            <h4 className="mp-serif text-4xl md:text-5xl mt-3 leading-tight">
              {teamSize} {teamSize === 1 ? "person" : "people"} on this project
            </h4>
          </div>
        </div>

        <ul className="mt-8 divide-y divide-[#e8e2d9] border-y border-[#e8e2d9]">
          {/* Owner row */}
          <li className="mp-row flex items-center justify-between gap-4 py-5">
            <div className="flex items-center gap-4 min-w-0">
              <span className="w-11 h-11 rounded-full flex items-center justify-center mp-serif text-base bg-[#1c1917] text-[#faf7f2] shrink-0">
                {initialsOf(project.owner?.name)}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{project.owner?.name || "Owner"}</p>
                <p className="text-xs text-[#a39c92]">Created this project</p>
              </div>
            </div>
            <span className="text-[11px] font-semibold px-3 py-1 rounded-full" style={{ background: ROLE.owner.tint, color: ROLE.owner.ink }}>
              Owner
            </span>
          </li>

          {members.map((m, i) => {
            const r = ROLE[m.role] || ROLE.viewer;
            const confirming = confirmRemoveId === m.user._id;
            return (
              <li key={m.user._id} className="mp-row py-5" style={{ animationDelay: `${i * 70}ms` }}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <span
                      className="w-11 h-11 rounded-full flex items-center justify-center mp-serif text-base shrink-0"
                      style={{ background: MONOGRAMS[i % MONOGRAMS.length], color: MONO_INK[i % MONO_INK.length] }}
                    >
                      {initialsOf(m.user.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{m.user.name}</p>
                      <p className="text-xs text-[#a39c92] truncate">{m.user.email || "Team member"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[11px] font-semibold px-3 py-1 rounded-full" style={{ background: r.tint, color: r.ink }}>
                      {r.label}
                    </span>
                    {isOwner && (
                      <button
                        onClick={() => setConfirmRemoveId(confirming ? null : m.user._id)}
                        className="text-xs font-semibold text-[#b4475a] px-3 py-1.5 rounded-full hover:bg-[#f9e1d6] transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                {confirming && (
                  <div className="mp-fade mt-4 rounded-2xl bg-[#f9e1d6]/60 border border-[#f2c9b8] p-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="flex items-center gap-2 text-sm text-[#a4502d]">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      Remove <span className="font-semibold">{m.user.name}</span> from this project? They lose access straight away.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRemove(m.user._id)}
                        disabled={removingId === m.user._id}
                        className="text-xs font-semibold bg-[#b4475a] text-[#faf7f2] px-4 py-2 rounded-full hover:bg-[#8f3346] transition-colors disabled:opacity-50"
                      >
                        {removingId === m.user._id ? "Removing…" : "Remove"}
                      </button>
                      <button
                        onClick={() => setConfirmRemoveId(null)}
                        className="text-xs font-semibold border border-[#e8e2d9] bg-[#ffffff] px-4 py-2 rounded-full hover:border-[#1c1917] transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {isOwner && (
          <form onSubmit={handleAdd} className="mt-8 grid md:grid-cols-[1fr_auto_auto] gap-3 items-stretch">
             <MemberEmailInput projectId={project._id} value={email} onChange={setEmail} inputClassName={inputCls} />
            <div className="inline-flex p-1 rounded-full bg-[#f1ece4] self-center">
              {[
                { id: "editor", label: "Editor", icon: Pencil },
                { id: "viewer", label: "Viewer", icon: Eye },
              ].map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setRole(o.id)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                    role === o.id ? "bg-[#1c1917] text-[#faf7f2]" : "text-[#6b655e] hover:text-[#1c1917]"
                  }`}
                >
                  <o.icon className="w-3.5 h-3.5" />
                  {o.label}
                </button>
              ))}
            </div>
            <button
              disabled={adding}
              className="inline-flex items-center justify-center gap-2 text-sm font-semibold bg-[#f6dccb] text-[#1c1917] pl-3 pr-5 py-3 rounded-full hover:bg-[#c4673f] hover:text-[#faf7f2] transition-colors disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              {adding ? "Inviting…" : "Invite"}
            </button>
          </form>
        )}

        {isOwner && (
          <div className="mt-6 grid md:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-[#faf7f2] border border-[#e8e2d9] p-5">
              <p className="flex items-center gap-2 text-xs font-semibold text-[#1c1917]">
                <Pencil className="w-3.5 h-3.5 text-[#3f6e5b]" /> Editor
              </p>
              <p className="mt-2 text-xs text-[#6b655e] leading-relaxed">Can create and edit notes, upload files, and comment.</p>
            </div>
            <div className="rounded-2xl bg-[#faf7f2] border border-[#e8e2d9] p-5">
              <p className="flex items-center gap-2 text-xs font-semibold text-[#1c1917]">
                <Eye className="w-3.5 h-3.5 text-[#a4502d]" /> Viewer
              </p>
              <p className="mt-2 text-xs text-[#6b655e] leading-relaxed">Can see everything and comment, but can't edit.</p>
            </div>
          </div>
        )}
      </div>

      {/* Public sharing */}
      {isOwner && (
        <div className="mp-in rounded-[32px] bg-[#ffffff] border border-[#e8e2d9] p-7 md:p-9">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2">
                {project.isPublic ? <Globe className="w-4 h-4 text-[#3f6e5b]" /> : <Lock className="w-4 h-4 text-[#6b655e]" />}
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#6b655e]">Public sharing</p>
              </div>
              <h4 className="mp-serif text-3xl mt-3 leading-tight">
                {project.isPublic ? "Anyone with the link can read this" : "This project is private"}
              </h4>
              <p className="mt-2 text-sm text-[#6b655e] leading-relaxed">
                A public read-only page shows the project's README and notes. Files, tasks and client messages stay private.
              </p>
            </div>
            <button
              onClick={toggleVisibility}
              disabled={changingVisibility}
              className="inline-flex items-center gap-2 text-sm font-semibold border border-[#e8e2d9] bg-[#ffffff] text-[#1c1917] px-5 py-2.5 rounded-full hover:border-[#1c1917] transition-colors disabled:opacity-50"
            >
              {project.isPublic ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
              {changingVisibility ? "Saving…" : project.isPublic ? "Make private" : "Make public"}
            </button>
          </div>

          {project.isPublic && publicUrl && (
            <div className="mt-6 flex flex-col sm:flex-row gap-2 items-stretch">
              <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-2xl bg-[#faf7f2] border border-[#e8e2d9] min-w-0">
                <ShieldCheck className="w-4 h-4 text-[#3f6e5b] shrink-0" />
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  onDoubleClick={(e) => {
                    e.preventDefault();
                    copyPublicUrl(publicUrl);
                  }}
                  className="text-xs font-mono text-[#3f6e5b] hover:underline truncate"
                  title="Click to open, double-click to copy"
                >
                  {publicUrl}
                </a>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => copyPublicUrl(publicUrl)}
                  className="inline-flex items-center gap-2 text-xs font-semibold bg-[#f6dccb] text-[#1c1917] px-4 py-3 rounded-2xl hover:bg-[#c4673f] hover:text-[#faf7f2] transition-colors"
                  aria-label="Copy public link"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-semibold border border-[#e8e2d9] bg-[#ffffff] px-4 py-3 rounded-2xl hover:border-[#1c1917] transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}