import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../api/axios.js";
import { UserPlus, Copy, RefreshCw, ShieldOff, Eye, EyeOff, AlertTriangle, Check } from "lucide-react";

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,400;1,9..144,500&display=swap');

.ca-serif { font-family: 'Fraunces', Georgia, serif; font-weight: 500; letter-spacing: -0.02em; }

@keyframes caIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes caFade { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
.ca-in { animation: caIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
.ca-card { animation: caIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) backwards; }
.ca-fade { animation: caFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) both; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
`;

const STATUS = {
  invited: { label: "Link sent", color: "#e0a46f", tint: "#f7ecc9", ink: "#8a6418" },
  active: { label: "Opened", color: "#3f6e5b", tint: "#dcebe2", ink: "#3f6e5b" },
  expired: { label: "Expired", color: "#a39c92", tint: "#f1ece4", ink: "#6b655e" },
  revoked: { label: "Access revoked", color: "#b4475a", tint: "#f9e1d6", ink: "#a4502d" },
};

const INK_TINTS = [
  { bg: "#f6dccb", ink: "#a4502d" },
  { bg: "#dcebe2", ink: "#3f6e5b" },
  { bg: "#f7ecc9", ink: "#8a6418" },
  { bg: "#efe6f0", ink: "#6e4a78" },
];

const inputCls =
  "w-full px-4 py-3 bg-[#ffffff] border border-[#e8e2d9] rounded-2xl text-sm placeholder-[#a39c92] focus:outline-none focus:border-[#c4673f] focus:ring-2 focus:ring-[#f6dccb]";
const labelCls = "block text-[11px] font-semibold uppercase tracking-wider text-[#6b655e] mb-2";
const fmt = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "");
const initialsOf = (email = "") => (email.split("@")[0] || "?").slice(0, 2).toUpperCase();

export default function ClientAccessPanel({ project, projectId, onProjectChanged }) {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState(project?.clientName && project.clientName !== "Client" ? project.clientName : "");
  const [email, setEmail] = useState(project?.clientEmail || "");
  const [sending, setSending] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [fresh, setFresh] = useState(null); // { email, magicLink, emailSent } shown right after inviting
  const [confirmingRevokeId, setConfirmingRevokeId] = useState(null);

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
    setBusyId(invite._id);
    try {
      await api.patch(`/projects/${projectId}/client-invite/${invite._id}/revoke`);
      toast.success("Access revoked");
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't revoke access");
    } finally {
      setBusyId(null);
      setConfirmingRevokeId(null);
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

  const activeCount = invites.filter((i) => i.status === "active").length;

  return (
    <div className="space-y-6">
      <style>{STYLES}</style>

      {/* Invite */}
      <div className="ca-in rounded-[32px] bg-[#ffffff] border border-[#e8e2d9] p-7 md:p-9 shadow-[0_30px_70px_-45px_rgba(60,40,20,0.35)]">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[#c4673f]">Client portal</p>
        <h3 className="ca-serif text-4xl md:text-5xl mt-3 leading-tight">Invite your client</h3>
        <p className="mt-3 text-sm text-[#6b655e] max-w-2xl leading-relaxed">
          They get a private link to a simple portal, with no account or password. Anyone you invite can only see what you
          choose to share.
        </p>

        <form onSubmit={submit} className="mt-7 grid sm:grid-cols-[1fr_1.4fr_auto] gap-4 items-end">
          <label>
            <span className={labelCls}>Client name</span>
            <input className={inputCls} placeholder="Acme Corp" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            <span className={labelCls}>Client email</span>
            <input
              className={inputCls}
              type="email"
              placeholder="client@acme.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <button
            disabled={sending}
            className="inline-flex items-center justify-center gap-2 text-sm font-semibold bg-[#1c1917] text-[#faf7f2] pl-3 pr-5 py-3 rounded-full hover:bg-[#c4673f] transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            <UserPlus className="w-4 h-4" />
            {sending ? "Creating…" : "Send invite"}
          </button>
        </form>

        {fresh && (
          <div className="ca-fade mt-6 rounded-[24px] bg-[#faf7f2] border border-[#f2c9b8] p-6 space-y-4">
            <div className="flex items-start gap-3">
              <span className="w-9 h-9 rounded-full bg-[#dcebe2] flex items-center justify-center shrink-0">
                <Check className="w-4 h-4 text-[#3f6e5b]" />
              </span>
              <p className="text-sm text-[#3a342e] leading-relaxed pt-1.5">
                {fresh.emailSent
                  ? `We emailed the link to ${fresh.email}. You can also copy it below.`
                  : `Email isn't set up on this server, so nothing was sent. Copy this link and send it to ${fresh.email} yourself.`}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                readOnly
                className="flex-1 px-4 py-3 bg-[#ffffff] border border-[#e8e2d9] rounded-2xl text-xs font-mono text-[#3a342e]"
                value={fresh.magicLink}
                onFocus={(e) => e.target.select()}
              />
              <button
                type="button"
                onClick={() => copy(fresh.magicLink)}
                className="inline-flex items-center justify-center gap-2 text-xs font-semibold bg-[#f6dccb] text-[#1c1917] px-5 py-3 rounded-2xl hover:bg-[#c4673f] hover:text-[#faf7f2] transition-colors whitespace-nowrap"
              >
                <Copy className="w-3.5 h-3.5" /> Copy link
              </button>
            </div>
            <p className="text-[11px] text-[#a39c92]">This link is shown only now. If you lose it, send a new one from the list below.</p>
          </div>
        )}
      </div>

      {/* People */}
      <div className="ca-in rounded-[32px] bg-[#ffffff] border border-[#e8e2d9] p-7 md:p-9">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#6b655e]">Access</p>
            <p className="ca-serif text-4xl mt-2">
              {invites.length} {invites.length === 1 ? "person" : "people"}
            </p>
          </div>
          <p className="text-xs text-[#6b655e]">{activeCount} opened the portal</p>
        </div>

        {loading ? (
          <div className="mt-6 space-y-3" aria-busy="true">
            <div className="h-20 rounded-2xl bg-[#f1ece4] animate-pulse" />
          </div>
        ) : invites.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-[#d9d1c4] p-8 text-center text-sm text-[#6b655e]">
            Nobody has been invited yet.
          </p>
        ) : (
          <ul className="mt-6 space-y-3">
            {invites.map((invite, i) => {
              const meta = STATUS[invite.status] || STATUS.invited;
              const busy = busyId === invite._id;
              const tone = INK_TINTS[i % INK_TINTS.length];
              const confirming = confirmingRevokeId === invite._id;
              return (
                <li
                  key={invite._id}
                  className="ca-card rounded-[24px] bg-[#faf7f2] border border-[#e8e2d9] p-5 hover:bg-[#ffffff] hover:shadow-[0_20px_44px_-30px_rgba(60,40,20,0.35)] transition-all duration-300"
                  style={{ animationDelay: `${i * 70}ms` }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <span
                        className="w-11 h-11 rounded-full flex items-center justify-center ca-serif text-base shrink-0"
                        style={{ background: tone.bg, color: tone.ink }}
                      >
                        {initialsOf(invite.email)}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{invite.email}</p>
                        <p className="text-[11px] text-[#a39c92] mt-0.5">
                          Invited {fmt(invite.createdAt)}
                          {invite.usedAt ? ` · first opened ${fmt(invite.usedAt)}` : ""}
                          {invite.status !== "revoked" ? ` · expires ${fmt(invite.expiresAt)}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full whitespace-nowrap"
                        style={{ background: meta.tint, color: meta.ink }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
                        {meta.label}
                      </span>
                      <button
                        disabled={busy}
                        onClick={() => resend(invite)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold border border-[#e8e2d9] bg-[#ffffff] px-4 py-2 rounded-full hover:border-[#c4673f] hover:text-[#a4502d] transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        {invite.status === "revoked" ? "Re-invite" : "Send new link"}
                      </button>
                      {invite.status !== "revoked" && (
                        <button
                          disabled={busy}
                          onClick={() => setConfirmingRevokeId(confirming ? null : invite._id)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#b4475a] px-3 py-2 rounded-full hover:bg-[#f9e1d6] transition-colors disabled:opacity-50"
                        >
                          <ShieldOff className="w-3.5 h-3.5" /> Revoke
                        </button>
                      )}
                    </div>
                  </div>

                  {confirming && (
                    <div className="ca-fade mt-4 rounded-2xl bg-[#f9e1d6]/60 border border-[#f2c9b8] p-4 flex flex-wrap items-center justify-between gap-3">
                      <p className="flex items-center gap-2 text-sm text-[#a4502d]">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        Remove <span className="font-semibold">{invite.email}</span>'s access? Their current link and session stop working immediately.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => revoke(invite)}
                          disabled={busy}
                          className="text-xs font-semibold bg-[#b4475a] text-[#faf7f2] px-4 py-2 rounded-full hover:bg-[#8f3346] transition-colors disabled:opacity-50"
                        >
                          Revoke access
                        </button>
                        <button
                          onClick={() => setConfirmingRevokeId(null)}
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
        )}
      </div>

      {/* Visibility */}
      <div className="ca-in grid md:grid-cols-2 gap-5">
        <div className="rounded-[28px] bg-[#dcebe2]/60 border border-[#bfe3cd] p-7">
          <div className="flex items-center gap-2 text-[#3f6e5b]">
            <Eye className="w-4 h-4" />
            <p className="text-[11px] uppercase tracking-[0.2em] font-semibold">They see</p>
          </div>
          <ul className="mt-5 space-y-2.5 text-sm text-[#2f4a3e] leading-relaxed">
            <li>Milestones and their status</li>
            <li>Files, notes and comments you mark as Shared</li>
            <li>Invoices you've sent</li>
            <li>Progress updates you've published</li>
          </ul>
        </div>
        <div className="rounded-[28px] bg-[#f9e1d6]/60 border border-[#f2c9b8] p-7">
          <div className="flex items-center gap-2 text-[#a4502d]">
            <EyeOff className="w-4 h-4" />
            <p className="text-[11px] uppercase tracking-[0.2em] font-semibold">They never see</p>
          </div>
          <ul className="mt-5 space-y-2.5 text-sm text-[#5b3a2c] leading-relaxed">
            <li>Your tasks</li>
            <li>Internal notes and team discussion</li>
            <li>Draft invoices and unsent updates</li>
            <li>Any AI review</li>
          </ul>
        </div>
      </div>
    </div>
  );
}