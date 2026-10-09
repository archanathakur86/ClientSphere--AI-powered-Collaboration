import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../api/axios.js";
import { UserCheck, Key, Mail, Copy, RefreshCw, ShieldAlert, CheckCircle2, XCircle } from "lucide-react";

const STATUS = {
  invited: { label: "Link sent, pending open", chip: "bg-indigo-500/10 text-indigo-400 dark:text-indigo-300 light:text-indigo-700 border-indigo-500/30" },
  active: { label: "Active Portal Session", chip: "bg-emerald-500/10 text-emerald-400 dark:text-emerald-300 light:text-emerald-700 border-emerald-500/30" },
  expired: { label: "Link Expired", chip: "bg-slate-500/10 text-slate-400 dark:text-slate-300 light:text-slate-700 border-slate-500/30" },
  revoked: { label: "Access Revoked", chip: "bg-rose-500/10 text-rose-400 dark:text-rose-300 light:text-rose-700 border-rose-500/30" },
};

const fmt = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "");

export default function ClientAccessPanel({ project, projectId, onProjectChanged }) {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState(project?.clientName && project.clientName !== "Client" ? project.clientName : "");
  const [email, setEmail] = useState(project?.clientEmail || "");
  const [sending, setSending] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [fresh, setFresh] = useState(null); // { email, magicLink, emailSent } shown right after inviting

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/projects/${projectId}/client-invites`);
      setInvites(res.data.invites || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't load client access");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const sendInvite = async (targetEmail, targetName) => {
    const res = await api.post(`/projects/${projectId}/client-invite`, { email: targetEmail, clientName: targetName || undefined });
    setFresh({ email: targetEmail, magicLink: res.data.magicLink, emailSent: Boolean(res.data.emailSent) });
    await load();
    onProjectChanged?.();
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return toast.error("Enter your client's email");
    setSending(true);
    try {
      await sendInvite(email.trim(), name.trim());
      toast.success("Invite created");
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't invite the client");
    } finally {
      setSending(false);
    }
  };

  const resend = async (invite) => {
    setBusyId(invite._id);
    try {
      await sendInvite(invite.email, "");
      toast.success("New link created");
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't create a new link");
    } finally {
      setBusyId(null);
    }
  };

  const revoke = async (invite) => {
    if (!window.confirm(`Remove ${invite.email}'s access? Their current link and session stop working immediately.`)) return;
    setBusyId(invite._id);
    try {
      await api.patch(`/projects/${projectId}/client-invite/${invite._id}/revoke`);
      toast.success("Access revoked");
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't revoke access");
    } finally {
      setBusyId(null);
    }
  };

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Couldn't copy automatically. Select the link and copy it.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Invite Form Card */}
      <div className="card p-6 space-y-5 border-indigo-500/20 shadow-md">
        <div className="space-y-1">
          <h4 className="font-bold text-base text-white dark:text-white light:text-slate-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-indigo-400" />
            <span>Client Portal Access & Security</span>
          </h4>
          <p className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-500">
            Invite clients to a clean, passwordless portal. They can review milestones, make payments, and download shared files.
          </p>
        </div>

        <form onSubmit={submit} className="grid sm:grid-cols-[1fr_1.4fr_auto] gap-4 items-end">
          <label className="text-xs font-semibold text-slate-400 dark:text-slate-400 light:text-slate-600 space-y-1">
            <span>Client Name</span>
            <input className="input" placeholder="Acme Corp" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="text-xs font-semibold text-slate-400 dark:text-slate-400 light:text-slate-600 space-y-1">
            <span>Client Email *</span>
            <input className="input" type="email" placeholder="client@acme.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <button className="btn btn-primary text-xs px-5 py-2.5" disabled={sending}>
            <Mail className="w-3.5 h-3.5" />
            <span>{sending ? "Creating…" : "Send Invite"}</span>
          </button>
        </form>

        {fresh && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 space-y-3 animate-fadeIn">
            <div className="text-xs text-emerald-300 dark:text-emerald-200 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {fresh.emailSent
                ? `We emailed the magic link to ${fresh.email}. You can also copy it below:`
                : `Magic link generated for ${fresh.email}. Copy it below to share:`}
            </div>
            <div className="flex gap-2">
              <input readOnly className="input text-xs font-mono select-all" value={fresh.magicLink} onFocus={(e) => e.target.select()} />
              <button type="button" className="btn btn-secondary text-xs px-4 py-2 flex-shrink-0" onClick={() => copy(fresh.magicLink)}>
                <Copy className="w-3.5 h-3.5 text-indigo-400" />
                <span>Copy link</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Invited Clients List */}
      <div className="card p-6 space-y-4">
        <h4 className="font-bold text-sm text-white dark:text-white light:text-slate-900">Active Client Tokens</h4>
        {loading ? (
          <div className="p-6 text-center text-slate-400 text-xs">Loading invited clients...</div>
        ) : invites.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-500">Nobody has been invited to this workspace yet.</p>
        ) : (
          <ul className="space-y-3">
            {invites.map((invite) => {
              const meta = STATUS[invite.status] || STATUS.invited;
              const busy = busyId === invite._id;
              return (
                <li
                  key={invite._id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-slate-950/60 dark:bg-slate-950/60 light:bg-slate-50 border border-slate-800/80 dark:border-slate-800/80 light:border-slate-200 p-4"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="text-sm font-bold text-white dark:text-white light:text-slate-900 truncate">{invite.email}</div>
                    <div className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-500 font-medium">
                      Invited {fmt(invite.createdAt)}
                      {invite.usedAt ? ` · first opened ${fmt(invite.usedAt)}` : ""}
                      {invite.status !== "revoked" ? ` · expires ${fmt(invite.expiresAt)}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border ${meta.chip}`}>
                      {meta.label}
                    </span>
                    <button className="btn btn-secondary text-xs px-3 py-1.5" disabled={busy} onClick={() => resend(invite)}>
                      <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{invite.status === "revoked" ? "Re-invite" : "New Link"}</span>
                    </button>
                    {invite.status !== "revoked" && (
                      <button className="btn btn-danger text-xs px-3 py-1.5" disabled={busy} onClick={() => revoke(invite)}>
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Revoke</span>
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Access Permission Breakdown */}
      <div className="card p-6 space-y-3 text-xs leading-relaxed">
        <div className="font-bold text-sm text-white dark:text-white light:text-slate-900 flex items-center gap-2">
          <Key className="w-4 h-4 text-indigo-400" />
          <span>Client Access & Privacy Rules</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 pt-1">
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 dark:text-emerald-200 space-y-1">
            <span className="font-bold uppercase tracking-wider text-[10px] text-emerald-400">Clients Can See:</span>
            <p>Milestones & approval status, shared files, shared notes & comments, sent invoices, and published updates.</p>
          </div>
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 dark:text-rose-200 space-y-1">
            <span className="font-bold uppercase tracking-wider text-[10px] text-rose-400">Clients Never See:</span>
            <p>Internal tasks, private notes, team threads, draft invoices, unreleased reports, or AI code reviews.</p>
          </div>
        </div>
      </div>
    </div>
  );
}