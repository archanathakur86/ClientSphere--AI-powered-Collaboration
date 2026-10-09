import React, { useState } from "react";
import toast from "react-hot-toast";
import api from "../api/axios.js";
import { Users, UserPlus, Shield, Globe, Copy, Check, Trash2, Eye } from "lucide-react";

export default function MembersPanel({ project, currentUserId, onUpdated }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("editor");
  const [adding, setAdding] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyPublicUrl = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy automatically — please copy manually");
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
    try {
      const res = await api.delete(`/projects/${project._id}/members/${userId}`);
      toast.success("Member removed");
      onUpdated(res.data.project);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove member");
    }
  };

  const toggleVisibility = async () => {
    try {
      const res = await api.patch(`/projects/${project._id}/visibility`);
      toast.success(res.data.isPublic ? "Project is now public" : "Project is now private");
      onUpdated({ ...project, isPublic: res.data.isPublic, publicSlug: res.data.publicSlug });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to change visibility");
    }
  };

  const publicUrl = project.publicSlug ? `${window.location.origin}/public/${project.publicSlug}` : "";

  return (
    <div className="space-y-6">
      {/* Team Members List */}
      <div className="card p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 dark:border-slate-800 light:border-slate-200 pb-3">
          <h4 className="font-bold text-base text-white dark:text-white light:text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <span>Workspace Team Members</span>
          </h4>
          <span className="badge bg-slate-800 text-slate-300 border-slate-700">
            {(project.members?.length || 0) + 1} member{project.members?.length === 0 ? "" : "s"}
          </span>
        </div>

        <ul className="space-y-3">
          {/* Owner Row */}
          <li className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 dark:bg-slate-950/60 light:bg-slate-50 border border-slate-800/80 dark:border-slate-800/80 light:border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center font-bold text-white text-xs shadow-inner">
                {project.owner?.name ? project.owner.name.charAt(0).toUpperCase() : "O"}
              </div>
              <div>
                <p className="text-xs font-bold text-white dark:text-white light:text-slate-900">{project.owner?.name}</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-400 light:text-slate-500">{project.owner?.email}</p>
              </div>
            </div>
            <span className="badge bg-indigo-500/10 text-indigo-400 dark:text-indigo-300 light:text-indigo-700 border-indigo-500/30">
              Owner
            </span>
          </li>

          {/* Member Rows */}
          {project.members?.map((m) => (
            <li
              key={m.user._id}
              className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 dark:bg-slate-950/60 light:bg-slate-50 border border-slate-800/80 dark:border-slate-800/80 light:border-slate-200"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-indigo-300 text-xs">
                  {m.user.name ? m.user.name.charAt(0).toUpperCase() : "M"}
                </div>
                <div>
                  <p className="text-xs font-bold text-white dark:text-white light:text-slate-900">{m.user.name}</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-400 light:text-slate-500">{m.user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="badge bg-slate-800 text-slate-300 border-slate-700 capitalize">{m.role}</span>
                {isOwner && (
                  <button
                    onClick={() => handleRemove(m.user._id)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10"
                    title="Remove member"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>

        {isOwner && (
          <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3 pt-2">
            <input
              className="input text-xs"
              placeholder="teammate@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <select className="input text-xs sm:w-36" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <button className="btn btn-primary text-xs px-5 py-2.5 whitespace-nowrap" disabled={adding}>
              <UserPlus className="w-3.5 h-3.5" />
              <span>{adding ? "Adding..." : "Invite Member"}</span>
            </button>
          </form>
        )}

        {isOwner && (
          <div className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-600 bg-slate-950/60 dark:bg-slate-950/60 light:bg-slate-50 border border-slate-800/80 rounded-xl p-3.5 space-y-1">
            <p>
              <span className="font-bold text-slate-200 dark:text-slate-200 light:text-slate-800">Editor Role</span>: Can edit
              notes, upload code files, manage milestones, and comment.
            </p>
            <p>
              <span className="font-bold text-slate-200 dark:text-slate-200 light:text-slate-800">Viewer Role</span>: Read-only
              access to internal documents, notes, and discussion.
            </p>
          </div>
        )}
      </div>

      {/* Public Showcase Card */}
      {isOwner && (
        <div className="card p-6 space-y-4">
          <div className="space-y-1">
            <h4 className="font-bold text-base text-white dark:text-white light:text-slate-900 flex items-center gap-2">
              <Globe className="w-5 h-5 text-indigo-400" />
              <span>Public Showcase Link</span>
            </h4>
            <p className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-500">
              Make this project's overview and shared assets viewable via a public read-only showcase link.
            </p>
          </div>

          <button className="btn btn-secondary text-xs px-4 py-2" onClick={toggleVisibility}>
            <span>{project.isPublic ? "Make Private" : "Make Public"}</span>
          </button>

          {project.isPublic && publicUrl && (
            <div className="flex items-center gap-2 bg-slate-950/80 dark:bg-slate-950/80 light:bg-slate-50 border border-slate-800/80 rounded-xl p-3 animate-fadeIn">
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-mono text-indigo-400 hover:underline truncate flex-1"
                title="Open Public Link"
              >
                {publicUrl}
              </a>
              <button
                onClick={() => copyPublicUrl(publicUrl)}
                className="btn btn-secondary text-xs px-3 py-1.5 flex-shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}