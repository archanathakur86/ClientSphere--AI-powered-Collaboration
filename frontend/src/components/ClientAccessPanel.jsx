import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../api/axios.js";

const STATUS = {
  invited: { label: "Link sent, not opened", chip: "bg-indigo-500/10 text-indigo-300 border-indigo-500/30" },
  active: { label: "Opened", chip: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" },
  expired: { label: "Expired", chip: "bg-slate-500/10 text-slate-300 border-slate-500/30" },
  revoked: { label: "Access revoked", chip: "bg-red-500/10 text-red-300 border-red-500/30" },
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
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy automatically. Select the link and copy it.");
    }
  };

  return (
    <div className="space-y-5">
      <div className="card space-y-4">
        <div>
          <h4 className="font-semibold">Invite your client</h4>
          <p className="text-sm text-slate-400 mt-1">
            They get a private link to a simple portal, with no account or password. Anyone you invite can only see what you choose to share.
          </p>
        </div>
        <form onSubmit={submit} className="grid sm:grid-cols-[1fr_1.4fr_auto] gap-3 items-end">
          <label className="text-xs text-slate-400 space-y-1">
            <span>Client name</span>
            <input className="input" placeholder="Acme Corp" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="text-xs text-slate-400 space-y-1">
            <span>Client email</span>
            <input className="input" type="email" placeholder="client@acme.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <button className="btn btn-primary text-sm" disabled={sending}>
            {sending ? "Creating…" : "Send invite"}
          </button>
        </form>

        {fresh && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2">
            <div className="text-sm text-emerald-200">
              {fresh.emailSent
                ? `We emailed the link to ${fresh.email}. You can also copy it below.`
                : `Email isn't set up on this server, so nothing was sent. Copy this link and send it to ${fresh.email} yourself.`}
            </div>
            <div className="flex gap-2">
              <input readOnly className="input text-xs font-mono" value={fresh.magicLink} onFocus={(e) => e.target.select()} />
              <button type="button" className="btn btn-secondary text-xs whitespace-nowrap" onClick={() => copy(fresh.magicLink)}>Copy link</button>
            </div>
            <div className="text-xs text-emerald-300/80">This link is shown only now. If you lose it, send a new one from the list below.</div>
          </div>
        )}
      </div>

      <div className="card">
        <h4 className="font-semibold mb-3">People with access</h4>
        {loading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : invites.length === 0 ? (
          <p className="text-sm text-slate-400">Nobody has been invited yet.</p>
        ) : (
          <ul className="space-y-3">
            {invites.map((invite) => {
              const meta = STATUS[invite.status] || STATUS.invited;
              const busy = busyId === invite._id;
              return (
                <li key={invite._id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-950 border border-slate-800 p-3">
                  <div className="min-w-0">
                    <div className="text-sm text-slate-100 truncate">{invite.email}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Invited {fmt(invite.createdAt)}
                      {invite.usedAt ? ` · first opened ${fmt(invite.usedAt)}` : ""}
                      {invite.status !== "revoked" ? ` · expires ${fmt(invite.expiresAt)}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap ${meta.chip}`}>{meta.label}</span>
                    <button className="btn btn-secondary text-xs py-1.5" disabled={busy} onClick={() => resend(invite)}>
                      {invite.status === "revoked" ? "Re-invite" : "Send new link"}
                    </button>
                    {invite.status !== "revoked" && (
                      <button className="btn btn-secondary text-xs py-1.5 text-red-300 hover:text-red-200" disabled={busy} onClick={() => revoke(invite)}>
                        Revoke
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="card text-sm text-slate-400 space-y-2">
        <div className="font-semibold text-slate-200">What your client can and can't see</div>
        <p>
          <span className="text-emerald-300">They see:</span> milestones and their status, files, notes and comments you mark as <em>Shared</em>, invoices you've sent, and progress updates you've published.
        </p>
        <p>
          <span className="text-red-300">They never see:</span> your tasks, internal notes, team discussion, draft invoices, unsent updates, or any AI review.
        </p>
      </div>
    </div>
  );
}