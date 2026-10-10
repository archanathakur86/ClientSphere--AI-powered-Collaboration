import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ShieldCheck, FileText, Download, CreditCard, MessageSquare, Send, Paperclip, ChevronDown, AlertTriangle, Check, Undo2, X } from "lucide-react";
import api, { clearPortalSession, PORTAL_SESSION_EXPIRED } from "../api/axios.js";
import { useRealtime } from "../hooks/useRealtime.js";
import NotificationBell from "../components/NotificationBell.jsx";
import OnlineUsersPill from "../components/OnlineUsersPill.jsx";

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,400;1,9..144,500&display=swap');

.cp-serif { font-family: 'Fraunces', Georgia, serif; font-weight: 500; letter-spacing: -0.025em; }

@keyframes cpUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
@keyframes cpFade { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
@keyframes cpDrift { 0%,100% { transform: translate(0,0); } 50% { transform: translate(18px,-12px); } }

.cp-up { animation: cpUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) backwards; }
.cp-fade { animation: cpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) both; }
.cp-drift { animation: cpDrift 18s ease-in-out infinite; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
`;

const MAX_FILE_BYTES = 10 * 1024 * 1024;

const money = (amount, currency = "usd") => {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: String(currency || "usd").toUpperCase() }).format(Number(amount || 0));
  } catch {
    return `$${Number(amount || 0).toFixed(2)}`;
  }
};

const formatDate = (value) => (value ? new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "");

const isOverdueMilestone = (m) => m.status !== "approved" && Boolean(m.dueDate) && new Date(m.dueDate) < new Date();
const isOverdueInvoice = (i) => i.status !== "paid" && (i.status === "overdue" || (Boolean(i.dueDate) && new Date(i.dueDate) < new Date()));

const MILESTONE_STATUS = {
  pending: { label: "Upcoming", color: "#a39c92", tint: "#f1ece4", ink: "#6b655e", hint: "The freelancer hasn't submitted this yet." },
  "in review": { label: "Needs your review", color: "#e0a46f", tint: "#f7ecc9", ink: "#8a6418", hint: "" },
  "changes requested": { label: "Changes requested", color: "#c4673f", tint: "#f9e1d6", ink: "#a4502d", hint: "Waiting for the freelancer to revise this." },
  approved: { label: "Approved", color: "#3f6e5b", tint: "#dcebe2", ink: "#3f6e5b", hint: "" },
};
const OVERDUE_STYLE = { label: "Overdue", color: "#b4475a", tint: "#f9e1d6", ink: "#8f3346" };

const INVOICE_STATUS = {
  sent: { label: "Sent", tint: "#f7ecc9", ink: "#8a6418" },
  overdue: { label: "Overdue", tint: "#f9e1d6", ink: "#a4502d" },
  paid: { label: "Paid", tint: "#dcebe2", ink: "#3f6e5b" },
};

const inputCls =
  "w-full px-4 py-3 bg-[#ffffff] border border-[#e8e2d9] rounded-2xl text-sm placeholder-[#a39c92] focus:outline-none focus:border-[#c4673f] focus:ring-2 focus:ring-[#f6dccb] resize-none";

const btnPrimary =
  "inline-flex items-center justify-center gap-2 text-xs font-semibold bg-[#1c1917] text-[#faf7f2] px-4 py-2.5 rounded-full hover:bg-[#c4673f] transition-colors disabled:opacity-50";
const btnGhost =
  "inline-flex items-center justify-center gap-2 text-xs font-semibold border border-[#e8e2d9] bg-[#ffffff] text-[#1c1917] px-4 py-2.5 rounded-full hover:border-[#c4673f] hover:text-[#a4502d] transition-colors disabled:opacity-50";

const initialsOf = (name = "") => name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";

const sizeLabel = (bytes = 0) => (bytes > 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

const Screen = ({ title, children }) => (
  <div className="relative min-h-screen bg-[#faf7f2] text-[#1c1917] font-sans flex items-center justify-center px-5 overflow-hidden">
    <style>{STYLES}</style>
    <div className="cp-drift pointer-events-none absolute -top-32 -left-24 w-[420px] h-[420px] rounded-full bg-[#f6dccb] opacity-60 blur-3xl" />
    <div className="cp-drift pointer-events-none absolute -bottom-32 -right-24 w-[420px] h-[420px] rounded-full bg-[#dcebe2] opacity-70 blur-3xl" />
    <div className="cp-up relative max-w-md w-full rounded-[32px] bg-[#ffffff] border border-[#e8e2d9] p-10 text-center shadow-[0_40px_80px_-40px_rgba(60,40,20,0.35)]">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-[#f6dccb] to-[#dcebe2] flex items-center justify-center">
        <ShieldCheck className="w-6 h-6 text-[#a4502d]" />
      </div>
      <p className="mt-6 text-[11px] uppercase tracking-[0.22em] text-[#6b655e]">ClientSphere</p>
      <h1 className="cp-serif text-4xl mt-3 leading-tight">{title}</h1>
      <div className="mt-4 text-sm text-[#6b655e] space-y-3 leading-relaxed">{children}</div>
    </div>
  </div>
);

function ProgressRing({ percent }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setShown(percent), 200);
    return () => clearTimeout(t);
  }, [percent]);
  const r = 58;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative w-36 h-36 shrink-0">
      <svg width="144" height="144" viewBox="0 0 144 144" className="-rotate-90">
        <circle cx="72" cy="72" r={r} fill="none" stroke="#efe9df" strokeWidth="10" />
        <defs>
          <linearGradient id="cpGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3f6e5b" />
            <stop offset="100%" stopColor="#86b99f" />
          </linearGradient>
        </defs>
        <circle
          cx="72"
          cy="72"
          r={r}
          fill="none"
          stroke="url(#cpGrad)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (shown / 100) * c}
          style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="cp-serif text-4xl leading-none">{percent}%</span>
        <span className="text-[10px] uppercase tracking-[0.2em] text-[#6b655e] mt-1">complete</span>
      </span>
    </div>
  );
}

export default function ClientPortal() {
  const { projectId, token: urlToken } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [status, setStatus] = useState("loading"); // loading | ready | needs-link | expired | error
  const [errorMessage, setErrorMessage] = useState("");
  const [data, setData] = useState(null);
  const [sessionToken, setSessionToken] = useState(() => localStorage.getItem("portalToken"));

  const [changeFor, setChangeFor] = useState(null); // milestone id whose "request changes" form is open
  const [changeText, setChangeText] = useState("");
  const [approvingId, setApprovingId] = useState(null); // milestone id awaiting inline approval confirm
  const [comment, setComment] = useState("");
  const [pendingFile, setPendingFile] = useState(null); // file chosen with the paperclip, sent with the next message
  const fileInputRef = useRef(null);
  const [busy, setBusy] = useState(""); // which action is running, e.g. "approve:<id>"
  const [showAllNotes, setShowAllNotes] = useState(false);

  const realtime = useRealtime({ projectId, enabled: status === "ready", token: sessionToken });

  const storeSession = (token) => {
    if (!token) return;
    localStorage.setItem("portalToken", token);
    localStorage.setItem("portalProjectId", projectId);
    setSessionToken(token);
  };

  const loadPortal = useCallback(async () => {
    const res = await api.get(`/client/projects/${projectId}`);
    // Every visit returns a renewed session token, so an active client stays signed in.
    if (res.data.clientAccessToken) {
      localStorage.setItem("portalToken", res.data.clientAccessToken);
      localStorage.setItem("portalProjectId", projectId);
      setSessionToken(res.data.clientAccessToken);
    }
    setData(res.data);
    return res.data;
  }, [projectId]);

  // Boot: either exchange the magic link (then hide the secret from the URL), or resume the
  // stored session. The page works after a refresh and when opened from an email link
  // that has no token in it.
  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      try {
        if (urlToken) {
          const res = await api.get(`/client/magic/${projectId}/${urlToken}`);
          if (cancelled) return;
          storeSession(res.data.clientAccessToken);
          // Replace the URL so the secret link isn't left in history or screenshots.
          navigate(`/client/${projectId}`, { replace: true });
          return;
        }

        const stored = localStorage.getItem("portalToken");
        if (!stored || localStorage.getItem("portalProjectId") !== projectId) {
          if (!cancelled) setStatus("needs-link");
          return;
        }
        await loadPortal();
        if (!cancelled) setStatus("ready");
      } catch (error) {
        if (cancelled) return;
        const code = error.response?.status;
        if (code === 401 || code === 403 || code === 404) {
          setStatus("expired");
        } else {
          setErrorMessage(error.response?.data?.message || "Couldn't load the portal. Please check your connection.");
          setStatus("error");
        }
      }
    };
    boot();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, urlToken]);

  // Session ended somewhere else (revoked / expired): show the friendly screen, not /login.
  useEffect(() => {
    const onExpired = () => setStatus("expired");
    window.addEventListener(PORTAL_SESSION_EXPIRED, onExpired);
    return () => window.removeEventListener(PORTAL_SESSION_EXPIRED, onExpired);
  }, []);

  // Live updates: when the freelancer submits a milestone, sends an invoice, etc.
  useEffect(() => {
    const socket = realtime.socket;
    if (!socket) return undefined;
    const refresh = () => loadPortal().catch(() => null);
    socket.on("notification:new", refresh);
    return () => socket.off("notification:new", refresh);
  }, [realtime.socket, loadPortal]);

  // Coming back from Stripe Checkout (?paid=1 / ?payment=cancelled).
  const handledReturn = useRef(false);
  useEffect(() => {
    if (status !== "ready" || handledReturn.current) return;
    if (searchParams.get("paid") === "1") {
      handledReturn.current = true;
      toast.success("Payment received. Thank you!");
      // The payment webhook can land a moment after the redirect, so refresh twice.
      setTimeout(() => loadPortal().catch(() => null), 2500);
      setTimeout(() => loadPortal().catch(() => null), 8000);
      setSearchParams({}, { replace: true });
    } else if (searchParams.get("payment") === "cancelled") {
      handledReturn.current = true;
      toast("Payment cancelled. You can pay any time from the invoice list.");
      setSearchParams({}, { replace: true });
    }
  }, [status, searchParams, setSearchParams, loadPortal]);

  const run = async (key, action, failMessage) => {
    setBusy(key);
    try {
      await action();
    } catch (error) {
      if (error.response?.status !== 401) toast.error(error.response?.data?.message || failMessage);
    } finally {
      setBusy("");
    }
  };

  const approveMilestone = (milestone) =>
    run(
      `approve:${milestone._id}`,
      async () => {
        await api.post(`/client/projects/${projectId}/milestones/${milestone._id}/approve`);
        toast.success("Milestone approved");
        setApprovingId(null);
        await loadPortal();
      },
      "Approval failed"
    );

  const sendChangeRequest = (milestone) => {
    if (!changeText.trim()) return toast.error("Describe the changes you'd like first");
    run(
      `changes:${milestone._id}`,
      async () => {
        await api.post(`/client/projects/${projectId}/milestones/${milestone._id}/request-changes`, { comment: changeText.trim() });
        toast.success("Change request sent");
        setChangeFor(null);
        setChangeText("");
        await loadPortal();
      },
      "Couldn't send the change request"
    );
  };

  const pickFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) return toast.error("Files must be under 10MB");
    setPendingFile(file);
  };

  // A message can be text, a file, or both. The file goes along with the message so the team sees them together.
  const submitComment = (e) => {
    e?.preventDefault?.();
    if (!comment.trim() && !pendingFile) return;
    run(
      "comment",
      async () => {
        let res;
        if (pendingFile) {
          const form = new FormData();
          form.append("content", comment.trim());
          form.append("file", pendingFile);
          res = await api.post(`/client/projects/${projectId}/comments`, form, { headers: { "Content-Type": "multipart/form-data" } });
        } else {
          res = await api.post(`/client/projects/${projectId}/comments`, { content: comment.trim() });
        }
        setComment("");
        setPendingFile(null);
        setData((prev) => ({ ...prev, comments: [...(prev.comments || []), res.data.comment] }));
      },
      "Couldn't send your message"
    );
  };

  const payInvoice = (invoice) =>
    run(
      `pay:${invoice._id}`,
      async () => {
        const res = await api.post(`/client/projects/${projectId}/invoices/${invoice._id}/payment-session`);
        if (res.data.url) window.location.href = res.data.url;
      },
      "Couldn't start the payment"
    );

  // Authenticated downloads can't be plain links, so fetch as a blob. The tab is opened first,
  // inside the click, because browsers block pop-ups opened after an await.
  const openBlob = async (path, fallbackName) => {
    const win = window.open("", "_blank");
    try {
      const res = await api.get(path, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      if (win) win.location.href = url;
      else {
        const link = document.createElement("a");
        link.href = url;
        link.download = fallbackName;
        link.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      if (win) win.close();
      toast.error("Couldn't open this file");
    }
  };

  const signOut = () => {
    clearPortalSession();
    setData(null);
    setStatus("needs-link");
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf7f2] text-[#6b655e]">
        <style>{STYLES}</style>
        <p className="cp-serif text-2xl animate-pulse">Opening your portal…</p>
      </div>
    );
  }

  if (status === "needs-link") {
    return (
      <Screen title="Open the link from your invitation">
        <p>This portal is private. Use the secure link in the email your freelancer sent you to get in.</p>
        <p>Can't find it? Ask them to send a new invitation.</p>
        <Link to="/" className="inline-block mt-2 text-sm font-semibold text-[#c4673f] hover:text-[#1c1917]">
          Learn about ClientSphere
        </Link>
      </Screen>
    );
  }

  if (status === "expired") {
    return (
      <Screen title="This access link has expired">
        <p>Your link has expired or the freelancer ended access. Nothing is wrong on your side.</p>
        <p>Please ask them to send you a fresh invitation link.</p>
      </Screen>
    );
  }

  if (status === "error") {
    return (
      <Screen title="Something went wrong">
        <p>{errorMessage}</p>
        <button className={`${btnPrimary} mt-2`} onClick={() => window.location.reload()}>
          Try again
        </button>
      </Screen>
    );
  }

  const portal = data;
  if (!portal) return null;

  const milestones = portal.milestones || [];
  const invoices = portal.invoices || [];
  const files = portal.files || [];
  const notes = portal.notes || [];
  const comments = portal.comments || [];
  const progress = portal.progress || 0;
  const awaitingReview = milestones.filter((m) => m.status === "in review").length;
  const unpaid = invoices.filter((i) => i.status !== "paid");
  const overdueMilestones = milestones.filter(isOverdueMilestone).length;
  const overdueInvoices = unpaid.filter(isOverdueInvoice).length;
  const clientName = portal.project.clientName || "Client";
  const visibleNotes = showAllNotes ? notes : notes.slice(0, 3);
  const sendDisabled = busy === "comment" || (!comment.trim() && !pendingFile);

  return (
    <div className="relative min-h-screen bg-[#faf7f2] text-[#1c1917] font-sans selection:bg-[#f6dccb]">
      <style>{STYLES}</style>
      <div className="cp-drift pointer-events-none fixed -top-40 -left-32 w-[480px] h-[480px] rounded-full bg-[#f6dccb] opacity-40 blur-3xl" />
      <div className="cp-drift pointer-events-none fixed top-60 -right-40 w-[420px] h-[420px] rounded-full bg-[#dcebe2] opacity-50 blur-3xl" style={{ animationDelay: "-7s" }} />

      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#faf7f2]/80 backdrop-blur-xl border-b border-[#e8e2d9]">
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#f6dccb] to-[#dcebe2] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-[#a4502d]" />
            </span>
            <span className="text-sm font-semibold">ClientSphere</span>
            <span className="hidden sm:inline text-[10px] uppercase tracking-[0.2em] text-[#6b655e] ml-2">Secure portal</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-[#ffffff] border border-[#e8e2d9]">
              <span className="w-7 h-7 rounded-full bg-[#f6dccb] text-[#a4502d] cp-serif text-sm flex items-center justify-center">
                {initialsOf(clientName)}
              </span>
              <span className="text-xs font-semibold max-w-[8rem] truncate">{clientName}</span>
            </div>
            <NotificationBell
              notifications={realtime.notifications}
              unreadCount={realtime.unreadCount}
              onMarkRead={realtime.markNotificationRead}
              onMarkAllRead={realtime.markAllRead}
            />
            <button onClick={signOut} className="text-xs font-semibold text-[#6b655e] hover:text-[#b4475a] px-3 py-2 rounded-full hover:bg-[#f9e1d6] transition-colors">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="relative max-w-5xl mx-auto px-5 pt-12 pb-20 space-y-16">
        {/* Hero */}
        <section className="cp-up grid md:grid-cols-12 gap-10 items-center">
          <div className="md:col-span-8">
            <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3f6e5b] bg-[#dcebe2] px-3 py-1.5 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5" /> Private to {clientName}
            </span>
            <h1 className="cp-serif text-5xl md:text-7xl mt-6 leading-[1.0]">{portal.project.name}</h1>
            {portal.project.description && (
              <p className="mt-5 text-lg text-[#6b655e] leading-relaxed max-w-2xl">{portal.project.description}</p>
            )}
            <div className="mt-6">
              <OnlineUsersPill users={realtime.onlineUsers || []} />
            </div>
          </div>
          <div className="md:col-span-4 flex justify-center md:justify-end">
            <ProgressRing percent={progress} />
          </div>
        </section>

        {/* Attention */}
        {(awaitingReview > 0 || unpaid.length > 0 || overdueMilestones > 0) && (
          <section className="cp-up grid sm:grid-cols-2 gap-4">
            {overdueMilestones + overdueInvoices > 0 && (
              <a href={overdueMilestones > 0 ? "#milestones" : "#invoices"} className="group rounded-[24px] bg-[#f9e1d6] border border-[#f2c9b8] p-6 hover:bg-[#f5d2c2] transition-colors">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#8f3346] font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Overdue
                </p>
                <p className="cp-serif text-3xl mt-2 text-[#6b2e1a]">
                  {overdueMilestones > 0 && `${overdueMilestones} milestone${overdueMilestones > 1 ? "s" : ""}`}
                  {overdueMilestones > 0 && overdueInvoices > 0 && " · "}
                  {overdueInvoices > 0 && `${overdueInvoices} invoice${overdueInvoices > 1 ? "s" : ""}`}
                </p>
                <p className="text-xs text-[#8f3346] mt-2 flex items-center gap-1">
                  See what's past due <ChevronDown className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
                </p>
              </a>
            )}
            {awaitingReview > 0 && (
              <a href="#milestones" className="group rounded-[24px] bg-[#f7ecc9]/70 border border-[#efd9a0] p-6 hover:bg-[#f7ecc9] transition-colors">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#8a6418] font-semibold">Needs your review</p>
                <p className="cp-serif text-3xl mt-2 text-[#5c3f0d]">
                  {awaitingReview} milestone{awaitingReview > 1 ? "s" : ""}
                </p>
                <p className="text-xs text-[#8a6418] mt-2 flex items-center gap-1">
                  Review now <ChevronDown className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
                </p>
              </a>
            )}
            {unpaid.length > 0 && overdueInvoices === 0 && (
              <a href="#invoices" className="group rounded-[24px] bg-[#f9e1d6]/60 border border-[#f2c9b8] p-6 hover:bg-[#f9e1d6] transition-colors">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#a4502d] font-semibold">Awaiting payment</p>
                <p className="cp-serif text-3xl mt-2 text-[#6b2e1a]">
                  {unpaid.length} invoice{unpaid.length > 1 ? "s" : ""}
                </p>
                <p className="text-xs text-[#a4502d] mt-2 flex items-center gap-1">
                  View invoices <ChevronDown className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
                </p>
              </a>
            )}
          </section>
        )}

        {/* Latest update */}
        <section className="cp-up">
          <div className="flex items-end justify-between gap-3 mb-5">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#6b655e]">Latest update</p>
            {portal.weeklyUpdateSentAt && <p className="text-xs text-[#a39c92]">{formatDate(portal.weeklyUpdateSentAt)}</p>}
          </div>
          <div className="rounded-[32px] bg-[#ffffff] border border-[#e8e2d9] p-8 md:p-10 relative overflow-hidden">
            <span className="absolute -top-6 -left-2 cp-serif text-[140px] leading-none text-[#f6dccb]">“</span>
            {portal.weeklyUpdate ? (
              <p className="relative cp-serif italic text-2xl md:text-3xl leading-snug text-[#3a342e] whitespace-pre-wrap">
                {portal.weeklyUpdate}
              </p>
            ) : (
              <p className="relative text-[#6b655e]">Your freelancer hasn't sent a progress update yet. It will appear here.</p>
            )}
          </div>
        </section>

        {/* Milestones timeline */}
        <section id="milestones" className="scroll-mt-24">
          <div className="flex items-end justify-between gap-3 mb-8">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-[#6b655e]">Deliverables</p>
              <p className="cp-serif text-4xl mt-2">Milestones</p>
            </div>
          </div>

          {milestones.length === 0 ? (
            <p className="rounded-[28px] border border-dashed border-[#d9d1c4] p-10 text-center text-[#6b655e]">No milestones have been added yet.</p>
          ) : (
            <ol className="relative ml-4">
              <span className="absolute left-[19px] top-6 bottom-6 w-px bg-[#e8e2d9]" />
              {milestones.map((m, i) => {
                const overdue = isOverdueMilestone(m);
                const meta = overdue ? OVERDUE_STYLE : MILESTONE_STATUS[m.status] || MILESTONE_STATUS.pending;
                const history = m.changeRequests || [];
                const busyApprove = busy === `approve:${m._id}`;
                const busyChange = busy === `changes:${m._id}`;
                return (
                  <li key={m._id} className="cp-up relative pl-14 pb-8 last:pb-0" style={{ animationDelay: `${i * 90}ms` }}>
                    <span
                      className="absolute left-0 top-5 w-10 h-10 rounded-full flex items-center justify-center border-4 border-[#faf7f2] shadow-sm"
                      style={{ background: meta.color }}
                    >
                      {m.status === "approved" ? (
                        <Check className="w-4 h-4 text-[#ffffff]" strokeWidth={3} />
                      ) : (
                        <span className="text-xs font-semibold text-[#ffffff]">{i + 1}</span>
                      )}
                    </span>

                    <div className={`rounded-[28px] bg-[#ffffff] border p-7 md:p-8 hover:shadow-[0_24px_50px_-30px_rgba(60,40,20,0.35)] transition-shadow duration-300 ${overdue ? "border-[#f2c9b8]" : "border-[#e8e2d9]"}`}>
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="cp-serif text-3xl leading-tight">{m.title}</p>
                          {m.description && <p className="text-sm text-[#6b655e] mt-2 whitespace-pre-wrap leading-relaxed">{m.description}</p>}
                        </div>
                        <span className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full" style={{ background: meta.tint, color: meta.ink }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
                          {overdue ? "Overdue" : meta.label}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-end justify-between gap-3 mt-5 text-xs">
                        <span className={`inline-flex items-center gap-1.5 ${overdue ? "text-[#b4475a] font-semibold" : "text-[#6b655e]"}`}>
                          {overdue && <AlertTriangle className="w-3.5 h-3.5" />}
                          {m.dueDate ? `${overdue ? "Was due" : "Due"} ${formatDate(m.dueDate)}` : "No due date"}
                        </span>
                        <span className="cp-serif text-2xl text-[#1c1917] tabular-nums">{money(m.amount)}</span>
                      </div>

                      {history.length > 0 && (
                        <div className="mt-5 space-y-2">
                          {history.map((h, idx) => (
                            <div key={idx} className="text-xs rounded-2xl bg-[#f9e1d6]/50 border border-[#f2c9b8] p-3.5 text-[#5b3a2c] leading-relaxed">
                              <span className="font-semibold text-[#a4502d]">You asked for changes{h.createdAt ? ` · ${formatDate(h.createdAt)}` : ""}: </span>
                              {h.comment}
                            </div>
                          ))}
                        </div>
                      )}

                      {m.status === "in review" && (
                        <div className="mt-6">
                          {approvingId === m._id && (
                            <div className="cp-fade mb-3 rounded-2xl bg-[#dcebe2]/60 border border-[#bfe3cd] p-4 flex flex-wrap items-center justify-between gap-3">
                              <p className="flex items-center gap-2 text-sm text-[#2f4a3e]">
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                Approve "{m.title}"{m.amount ? ` (${money(m.amount)})` : ""}? This confirms you accept the work.
                              </p>
                              <div className="flex gap-2">
                                <button onClick={() => approveMilestone(m)} disabled={busyApprove} className={btnPrimary}>
                                  {busyApprove ? "Approving…" : "Yes, approve"}
                                </button>
                                <button onClick={() => setApprovingId(null)} className={btnGhost}>
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}

                          {changeFor === m._id ? (
                            <div className="cp-fade space-y-3">
                              <textarea
                                value={changeText}
                                onChange={(e) => setChangeText(e.target.value)}
                                rows={3}
                                autoFocus
                                className={inputCls}
                                placeholder="What should be changed?"
                              />
                              <div className="flex gap-2">
                                <button onClick={() => sendChangeRequest(m)} disabled={busyChange} className={btnPrimary}>
                                  {busyChange ? "Sending…" : "Send change request"}
                                </button>
                                <button
                                  onClick={() => {
                                    setChangeFor(null);
                                    setChangeText("");
                                  }}
                                  className={btnGhost}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            approvingId !== m._id && (
                              <div className="flex flex-wrap gap-2">
                                <button onClick={() => setApprovingId(m._id)} disabled={Boolean(busy)} className={btnPrimary}>
                                  <Check className="w-3.5 h-3.5" /> Approve
                                </button>
                                <button
                                  onClick={() => {
                                    setChangeFor(m._id);
                                    setChangeText("");
                                  }}
                                  disabled={Boolean(busy)}
                                  className={btnGhost}
                                >
                                  <Undo2 className="w-3.5 h-3.5" /> Request changes
                                </button>
                              </div>
                            )
                          )}
                        </div>
                      )}

                      {m.status === "approved" && m.approvedAt && (
                        <p className="mt-5 text-xs font-medium text-[#3f6e5b]">Approved on {formatDate(m.approvedAt)}</p>
                      )}
                      {!overdue && MILESTONE_STATUS[m.status]?.hint && m.status !== "in review" && m.status !== "approved" && (
                        <p className="mt-5 text-xs text-[#a39c92]">{MILESTONE_STATUS[m.status].hint}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {/* Invoices ledger */}
        <section id="invoices" className="scroll-mt-24">
          <div className="mb-8">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#6b655e]">Billing</p>
            <p className="cp-serif text-4xl mt-2">Invoices</p>
          </div>
          {invoices.length === 0 ? (
            <p className="rounded-[28px] border border-dashed border-[#d9d1c4] p-10 text-center text-[#6b655e]">
              No invoices yet. They appear here once the freelancer sends one.
            </p>
          ) : (
            <div className="rounded-[32px] bg-[#ffffff] border border-[#e8e2d9] divide-y divide-[#e8e2d9] overflow-hidden">
              {invoices.map((invoice) => {
                const overdue = isOverdueInvoice(invoice);
                const st = overdue ? INVOICE_STATUS.overdue : INVOICE_STATUS[invoice.status] || INVOICE_STATUS.sent;
                const busyPay = busy === `pay:${invoice._id}`;
                return (
                  <div key={invoice._id} className="p-6 md:p-7 flex flex-wrap items-center justify-between gap-5 hover:bg-[#faf7f2] transition-colors">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-[11px] font-mono text-[#6b655e] bg-[#f1ece4] px-2.5 py-1 rounded-full">{invoice.invoiceNumber || "Invoice"}</span>
                        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize" style={{ background: st.tint, color: st.ink }}>
                          {st.label}
                        </span>
                      </div>
                      <p className="cp-serif text-3xl mt-3 tabular-nums">{money(invoice.amount, invoice.currency)}</p>
                      <p className={`text-xs mt-1.5 flex items-center gap-1.5 ${overdue ? "text-[#b4475a] font-semibold" : "text-[#6b655e]"}`}>
                        {overdue && <AlertTriangle className="w-3.5 h-3.5" />}
                        {invoice.dueDate && invoice.status !== "paid" ? `${overdue ? "Was due" : "Due"} ${formatDate(invoice.dueDate)}` : ""}
                        {invoice.paidAt ? `Paid ${formatDate(invoice.paidAt)}` : ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openBlob(`/client/projects/${projectId}/invoices/${invoice._id}/pdf`, `${invoice.invoiceNumber || "invoice"}.pdf`)} className={btnGhost}>
                        <Download className="w-3.5 h-3.5" /> PDF
                      </button>
                      {invoice.status !== "paid" && (
                        <button onClick={() => payInvoice(invoice)} disabled={busyPay} className={btnPrimary}>
                          <CreditCard className="w-3.5 h-3.5" /> {busyPay ? "Opening…" : "Pay now"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Files + notes */}
        <section className="grid md:grid-cols-2 gap-8">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#6b655e]">Shared files</p>
            <p className="cp-serif text-3xl mt-2 mb-6">Documents</p>
            {files.length === 0 ? (
              <p className="rounded-[24px] border border-dashed border-[#d9d1c4] p-8 text-center text-sm text-[#6b655e]">No files have been shared with you yet.</p>
            ) : (
              <ul className="space-y-3">
                {files.map((file) => (
                  <li key={file._id} className="flex items-center justify-between gap-3 rounded-[22px] bg-[#ffffff] border border-[#e8e2d9] px-5 py-4 hover:shadow-[0_18px_40px_-28px_rgba(60,40,20,0.35)] transition-shadow">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-10 h-10 rounded-xl bg-[#f6dccb] flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-[#a4502d]" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{file.originalName}</p>
                        <p className="text-[11px] text-[#a39c92]">
                          v{file.version || 1}
                          {file.createdAt ? ` · ${formatDate(file.createdAt)}` : ""}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => openBlob(`/client/projects/${projectId}/files/${file._id}/download`, file.originalName)} className={btnGhost}>
                      Open
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#6b655e]">Shared notes</p>
            <p className="cp-serif text-3xl mt-2 mb-6">Notes</p>
            {notes.length === 0 ? (
              <p className="rounded-[24px] border border-dashed border-[#d9d1c4] p-8 text-center text-sm text-[#6b655e]">No notes have been shared with you yet.</p>
            ) : (
              <div className="space-y-3">
                {visibleNotes.map((note) => (
                  <details key={note._id} className="group rounded-[22px] bg-[#ffffff] border border-[#e8e2d9] px-5 py-4 open:shadow-[0_18px_40px_-28px_rgba(60,40,20,0.35)] transition-shadow">
                    <summary className="cursor-pointer list-none flex items-center justify-between gap-3">
                      <span className="cp-serif text-xl">{note.title}</span>
                      <ChevronDown className="w-4 h-4 text-[#6b655e] group-open:rotate-180 transition-transform" />
                    </summary>
                    <div className="text-sm text-[#3a342e] whitespace-pre-wrap mt-3 leading-relaxed">{note.content}</div>
                  </details>
                ))}
                {notes.length > 3 && (
                  <button onClick={() => setShowAllNotes((s) => !s)} className="text-xs font-semibold text-[#c4673f] hover:text-[#1c1917] transition-colors">
                    {showAllNotes ? "Show fewer" : `Show all ${notes.length} notes`}
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Conversation */}
        <section>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#6b655e]">Conversation</p>
          <p className="cp-serif text-4xl mt-2 mb-8">Messages</p>

          <div className="rounded-[32px] bg-[#ffffff] border border-[#e8e2d9] p-6 md:p-8 shadow-[0_30px_70px_-45px_rgba(60,40,20,0.35)]">
            {comments.length === 0 ? (
              <p className="text-sm text-[#6b655e] text-center py-8 flex flex-col items-center gap-3">
                <MessageSquare className="w-6 h-6 text-[#c9c1b5]" />
                No messages yet. Questions and feedback go here.
              </p>
            ) : (
              <div className="space-y-4 max-h-[28rem] overflow-y-auto pr-1">
                {comments.map((item) => (
                  <div key={item._id} className={`flex ${item.fromClient ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-[22px] px-5 py-3.5 ${item.fromClient ? "bg-[#f6dccb] rounded-br-md" : "bg-[#faf7f2] border border-[#e8e2d9] rounded-bl-md"}`}>
                      <div className="flex items-center gap-3 mb-1.5">
                        <span className="text-xs font-semibold">{item.fromClient ? "You" : item.authorName || item.author?.name || "Freelancer"}</span>
                        {item.createdAt && <span className="text-[10px] text-[#6b655e]">{formatDate(item.createdAt)}</span>}
                      </div>
                      {item.content && <p className="text-sm text-[#2b2620] whitespace-pre-wrap leading-relaxed">{item.content}</p>}
                      {item.attachments?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {item.attachments.map((att) => (
                            <button
                              key={att.index}
                              type="button"
                              onClick={() => openBlob(`/client/projects/${projectId}/comments/${item._id}/attachments/${att.index}`, att.originalName)}
                              className="inline-flex items-center gap-2 text-xs font-semibold bg-[#ffffff] border border-[#e8e2d9] rounded-xl px-3 py-2 hover:border-[#c4673f] transition-colors"
                            >
                              <Paperclip className="w-3.5 h-3.5 text-[#a4502d]" />
                              <span className="truncate max-w-[14rem]">{att.originalName}</span>
                              <span className="text-[10px] text-[#a39c92]">{sizeLabel(att.size)}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {pendingFile && (
              <div className="cp-fade mt-6 flex items-center justify-between gap-3 rounded-2xl bg-[#faf7f2] border border-[#e8e2d9] px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-9 h-9 rounded-xl bg-[#f6dccb] flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-[#a4502d]" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{pendingFile.name}</p>
                    <p className="text-[11px] text-[#a39c92]">{sizeLabel(pendingFile.size)} · will be sent with your message</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingFile(null)}
                  className="w-8 h-8 rounded-full hover:bg-[#f1ece4] flex items-center justify-center shrink-0"
                  aria-label="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <form onSubmit={submitComment} className="mt-4 flex items-end gap-3 rounded-[24px] bg-[#faf7f2] border border-[#e8e2d9] p-3 focus-within:border-[#c4673f] focus-within:ring-2 focus-within:ring-[#f6dccb] transition-all">
              <input ref={fileInputRef} type="file" className="hidden" onChange={pickFile} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy === "comment"}
                className="w-9 h-9 rounded-full bg-[#ffffff] border border-[#e8e2d9] flex items-center justify-center shrink-0 mb-1 hover:border-[#c4673f] hover:text-[#a4502d] transition-colors disabled:opacity-50"
                aria-label="Attach a file"
                title="Attach a screenshot or file"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (!sendDisabled) submitComment(e);
                  }
                }}
                rows={1}
                className="flex-1 bg-transparent resize-none text-sm placeholder-[#a39c92] focus:outline-none py-2 max-h-32"
                placeholder={pendingFile ? "Add a message about this file (optional)…" : "Write a message to your freelancer…"}
              />
              <button
                type="submit"
                disabled={sendDisabled}
                className="w-11 h-11 rounded-full bg-[#1c1917] text-[#faf7f2] flex items-center justify-center hover:bg-[#c4673f] transition-colors disabled:opacity-40 shrink-0"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <p className="mt-3 text-[11px] text-[#a39c92] px-2">Attach a screenshot or document up to 10MB. Your team can open it from the discussion.</p>
          </div>
        </section>

        <footer className="text-center text-xs text-[#a39c92] pt-6">Secure client portal · Powered by ClientSphere</footer>
      </main>
    </div>
  );
}