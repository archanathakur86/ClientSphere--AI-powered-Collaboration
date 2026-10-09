import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import api, { clearPortalSession, PORTAL_SESSION_EXPIRED } from "../api/axios.js";
import { useRealtime } from "../hooks/useRealtime.js";
import NotificationBell from "../components/NotificationBell.jsx";
import OnlineUsersPill from "../components/OnlineUsersPill.jsx";
import { Sparkles, CheckCircle2, Clock, AlertTriangle, FileText, Download, Send, CreditCard, ShieldCheck, LogOut, MessageSquare } from "lucide-react";

const money = (amount, currency = "usd") => {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: String(currency || "usd").toUpperCase() }).format(Number(amount || 0));
  } catch {
    return `$${Number(amount || 0).toFixed(2)}`;
  }
};

const formatDate = (value) => (value ? new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "");

const MILESTONE_STATUS = {
  pending: { label: "Upcoming", chip: "bg-slate-500/10 text-slate-400 dark:text-slate-300 light:text-slate-700 border-slate-500/30", hint: "The freelancer hasn't submitted this yet." },
  "in review": { label: "Needs your review", chip: "bg-amber-500/10 text-amber-400 dark:text-amber-300 light:text-amber-700 border-amber-500/30", hint: "" },
  "changes requested": { label: "Changes requested", chip: "bg-orange-500/10 text-orange-400 dark:text-orange-300 light:text-orange-700 border-orange-500/30", hint: "Waiting for the freelancer to revise this." },
  approved: { label: "Approved", chip: "bg-emerald-500/10 text-emerald-400 dark:text-emerald-300 light:text-emerald-700 border-emerald-500/30", hint: "" },
};

const INVOICE_STATUS = {
  sent: "bg-indigo-500/10 text-indigo-400 dark:text-indigo-300 light:text-indigo-700 border-indigo-500/30",
  overdue: "bg-rose-500/10 text-rose-400 dark:text-rose-300 light:text-rose-700 border-rose-500/30",
  paid: "bg-emerald-500/10 text-emerald-400 dark:text-emerald-300 light:text-emerald-700 border-emerald-500/30",
};

const Chip = ({ className, children }) => (
  <span className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border whitespace-nowrap ${className}`}>{children}</span>
);

const Screen = ({ title, children }) => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 bg-radial-gradient">
    <div className="card max-w-md w-full text-center space-y-4 p-8 shadow-2xl">
      <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto">
        <Sparkles className="w-6 h-6" />
      </div>
      <div className="text-xs uppercase tracking-widest text-indigo-400 font-bold">ClientSphere Portal</div>
      <h1 className="text-xl font-bold text-white tracking-tight">{title}</h1>
      <div className="text-xs text-slate-400 space-y-3 leading-relaxed">{children}</div>
    </div>
  </div>
);

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
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(""); // which action is running, e.g. "approve:<id>"

  const realtime = useRealtime({ projectId, enabled: status === "ready", token: sessionToken });

  const storeSession = (token) => {
    if (!token) return;
    localStorage.setItem("portalToken", token);
    localStorage.setItem("portalProjectId", projectId);
    setSessionToken(token);
  };

  const loadPortal = useCallback(async () => {
    const res = await api.get(`/client/projects/${projectId}`);
    if (res.data.clientAccessToken) {
      localStorage.setItem("portalToken", res.data.clientAccessToken);
      localStorage.setItem("portalProjectId", projectId);
      setSessionToken(res.data.clientAccessToken);
    }
    setData(res.data);
    return res.data;
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      try {
        if (urlToken) {
          const res = await api.get(`/client/magic/${projectId}/${urlToken}`);
          if (cancelled) return;
          storeSession(res.data.clientAccessToken);
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

  useEffect(() => {
    const onExpired = () => setStatus("expired");
    window.addEventListener(PORTAL_SESSION_EXPIRED, onExpired);
    return () => window.removeEventListener(PORTAL_SESSION_EXPIRED, onExpired);
  }, []);

  useEffect(() => {
    const socket = realtime.socket;
    if (!socket) return undefined;
    const refresh = () => loadPortal().catch(() => null);
    socket.on("notification:new", refresh);
    return () => socket.off("notification:new", refresh);
  }, [realtime.socket, loadPortal]);

  const handledReturn = useRef(false);
  useEffect(() => {
    if (status !== "ready" || handledReturn.current) return;
    if (searchParams.get("paid") === "1") {
      handledReturn.current = true;
      toast.success("Payment received. Thank you!");
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

  const approveMilestone = (milestone) => {
    const price = milestone.amount ? ` (${money(milestone.amount)})` : "";
    if (!window.confirm(`Approve "${milestone.title}"${price}?\n\nThis confirms you accept the work and the freelancer can invoice for it.`)) return;
    run(
      `approve:${milestone._id}`,
      async () => {
        await api.post(`/client/projects/${projectId}/milestones/${milestone._id}/approve`);
        toast.success("Milestone approved");
        await loadPortal();
      },
      "Approval failed"
    );
  };

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

  const submitComment = (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    run(
      "comment",
      async () => {
        const res = await api.post(`/client/projects/${projectId}/comments`, { content: comment.trim() });
        setComment("");
        setData((prev) => ({ ...prev, comments: [...(prev.comments || []), res.data.comment] }));
      },
      "Couldn't send your comment"
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
      <div className="min-h-screen flex items-center justify-center text-slate-400 bg-slate-950">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mr-3" />
        <span className="text-sm">Opening secure client portal…</span>
      </div>
    );
  }

  if (status === "needs-link") {
    return (
      <Screen title="Open the link from your invitation">
        <p>This portal is private. Use the secure magic link in the email your freelancer sent you to get in.</p>
        <p className="text-slate-500">Can't find it? Ask them to send a fresh invitation.</p>
        <Link to="/" className="btn btn-primary text-xs inline-flex mt-2">Learn about ClientSphere</Link>
      </Screen>
    );
  }

  if (status === "expired") {
    return (
      <Screen title="This access link has expired">
        <p>Your link has expired or the freelancer ended access. Nothing is wrong on your side.</p>
        <p>Please ask your freelancer to send you a fresh invitation link.</p>
      </Screen>
    );
  }

  if (status === "error") {
    return (
      <Screen title="Something went wrong">
        <p>{errorMessage}</p>
        <button className="btn btn-primary text-xs mt-2" onClick={() => window.location.reload()}>Try again</button>
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

  return (
    <div className="min-h-screen bg-slate-950 dark:bg-slate-950 light:bg-slate-50 text-slate-100 dark:text-slate-100 light:text-slate-900 font-sans pb-16 bg-radial-gradient">
      {/* Top Client Header Bar */}
      <header className="border-b border-slate-800/80 dark:border-slate-800/80 light:border-slate-200 bg-slate-950/80 dark:bg-slate-950/80 light:bg-white/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Secure Client Portal
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white dark:text-white light:text-slate-900 tracking-tight mt-0.5 truncate">
              {portal.project.name}
            </h1>
            {portal.project.description && (
              <p className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-500 truncate max-w-lg">
                {portal.project.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="hidden sm:block text-right text-xs">
              <div className="font-bold text-white dark:text-white light:text-slate-900">{portal.project.clientName || "Client"}</div>
              <button onClick={signOut} className="text-slate-400 hover:text-rose-400 text-[11px] font-medium transition-colors">
                Sign out
              </button>
            </div>
            <NotificationBell
              notifications={realtime.notifications}
              unreadCount={realtime.unreadCount}
              onMarkRead={realtime.markNotificationRead}
              onMarkAllRead={realtime.markAllRead}
            />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 space-y-6">
        {(awaitingReview > 0 || unpaid.length > 0) && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-xs text-amber-300 dark:text-amber-200 shadow-md space-y-1 animate-fadeIn">
            {awaitingReview > 0 && (
              <div className="font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>{awaitingReview} milestone{awaitingReview > 1 ? "s are" : " is"} awaiting your review & approval below.</span>
              </div>
            )}
            {unpaid.length > 0 && (
              <div className="font-semibold flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-400" />
                <span>{unpaid.length} invoice{unpaid.length > 1 ? "s are" : " is"} awaiting payment.</span>
              </div>
            )}
          </div>
        )}

        {/* Progress Card */}
        <section className="card p-6 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 light:text-slate-500">
                Delivery Progress
              </div>
              <div className="text-2xl font-extrabold text-white dark:text-white light:text-slate-900 tracking-tight mt-0.5">
                {progress}% Complete
              </div>
            </div>
            <OnlineUsersPill users={realtime.onlineUsers || []} />
          </div>
          <div className="h-3 rounded-full bg-slate-800 dark:bg-slate-800 light:bg-slate-200 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </section>

        {/* Latest Progress Update */}
        <section className="card p-6 space-y-3">
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 dark:border-slate-800 light:border-slate-200 pb-3">
            <h2 className="text-sm font-bold text-white dark:text-white light:text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Latest Executive Progress Report</span>
            </h2>
            {portal.weeklyUpdateSentAt && (
              <span className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-500 font-medium">
                {formatDate(portal.weeklyUpdateSentAt)}
              </span>
            )}
          </div>
          {portal.weeklyUpdate ? (
            <p className="text-xs text-slate-300 dark:text-slate-300 light:text-slate-700 leading-relaxed whitespace-pre-wrap">
              {portal.weeklyUpdate}
            </p>
          ) : (
            <p className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-500">
              Your freelancer hasn't sent a progress update yet. It will appear here once published.
            </p>
          )}
        </section>

        {/* Milestones Approval Section */}
        <section className="card p-6 space-y-4">
          <h2 className="text-sm font-bold text-white dark:text-white light:text-slate-900 border-b border-slate-800 dark:border-slate-800 light:border-slate-200 pb-3">
            Project Deliverables & Milestones
          </h2>
          {milestones.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-500">No milestones have been added yet.</p>
          ) : (
            <div className="space-y-4">
              {milestones.map((m) => {
                const meta = MILESTONE_STATUS[m.status] || MILESTONE_STATUS.pending;
                const history = m.changeRequests || [];
                return (
                  <div
                    key={m._id}
                    className="rounded-2xl bg-slate-950/60 dark:bg-slate-950/60 light:bg-slate-50 border border-slate-800/80 dark:border-slate-800/80 light:border-slate-200 p-5 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 space-y-1">
                        <div className="font-bold text-sm text-white dark:text-white light:text-slate-900">{m.title}</div>
                        {m.description && (
                          <div className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-600 whitespace-pre-wrap leading-relaxed">
                            {m.description}
                          </div>
                        )}
                      </div>
                      <Chip className={meta.chip}>{meta.label}</Chip>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/60 dark:border-slate-800/60 light:border-slate-200">
                      <span className="text-slate-400 dark:text-slate-400 light:text-slate-500">
                        {m.dueDate ? `Due ${formatDate(m.dueDate)}` : "No due date"}
                      </span>
                      <span className="text-white dark:text-white light:text-slate-900 font-bold text-sm">{money(m.amount)}</span>
                    </div>

                    {history.length > 0 && (
                      <div className="space-y-2 pt-1">
                        {history.map((h, i) => (
                          <div key={i} className="text-xs rounded-xl bg-orange-500/10 border border-orange-500/20 p-3 text-orange-200">
                            <span className="text-orange-400 font-bold">You requested changes{h.createdAt ? ` · ${formatDate(h.createdAt)}` : ""}: </span>
                            {h.comment}
                          </div>
                        ))}
                      </div>
                    )}

                    {m.status === "in review" && (
                      <div className="pt-2">
                        {changeFor === m._id ? (
                          <div className="space-y-3 bg-slate-900/90 p-4 rounded-xl border border-slate-800">
                            <textarea
                              value={changeText}
                              onChange={(e) => setChangeText(e.target.value)}
                              rows={3}
                              autoFocus
                              className="input text-xs"
                              placeholder="What revisions or changes would you like?"
                            />
                            <div className="flex gap-2 justify-end">
                              <button onClick={() => { setChangeFor(null); setChangeText(""); }} className="btn btn-secondary text-xs">
                                Cancel
                              </button>
                              <button onClick={() => sendChangeRequest(m)} disabled={busy === `changes:${m._id}`} className="btn btn-primary text-xs px-4">
                                {busy === `changes:${m._id}` ? "Sending…" : "Submit Request"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button onClick={() => approveMilestone(m)} disabled={Boolean(busy)} className="btn btn-primary text-xs px-5">
                              {busy === `approve:${m._id}` ? "Approving…" : "Approve Milestone"}
                            </button>
                            <button onClick={() => { setChangeFor(m._id); setChangeText(""); }} disabled={Boolean(busy)} className="btn btn-secondary text-xs">
                              Request Changes
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    {m.status === "approved" && m.approvedAt && (
                      <div className="text-xs text-emerald-400 font-medium flex items-center gap-1.5 pt-1">
                        <CheckCircle2 className="w-4 h-4" /> Approved on {formatDate(m.approvedAt)}
                      </div>
                    )}
                    {meta.hint && m.status !== "in review" && m.status !== "approved" && (
                      <div className="text-xs text-slate-500">{meta.hint}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Invoices Section */}
        <section className="card p-6 space-y-4">
          <h2 className="text-sm font-bold text-white dark:text-white light:text-slate-900 border-b border-slate-800 dark:border-slate-800 light:border-slate-200 pb-3">
            Invoices & Payments
          </h2>
          {invoices.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-500">No invoices generated yet.</p>
          ) : (
            <div className="space-y-3">
              {invoices.map((invoice) => (
                <div
                  key={invoice._id}
                  className="rounded-xl bg-slate-950/60 dark:bg-slate-950/60 light:bg-slate-50 border border-slate-800/80 dark:border-slate-800/80 light:border-slate-200 p-4 flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="font-bold text-sm text-white dark:text-white light:text-slate-900 flex items-center gap-2">
                      {invoice.invoiceNumber || "Invoice"}
                      <Chip className={INVOICE_STATUS[invoice.status] || INVOICE_STATUS.sent}>{invoice.status}</Chip>
                    </div>
                    <div className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-500 font-medium">
                      {money(invoice.amount, invoice.currency)}
                      {invoice.dueDate && invoice.status !== "paid" ? ` · due ${formatDate(invoice.dueDate)}` : ""}
                      {invoice.paidAt ? ` · paid ${formatDate(invoice.paidAt)}` : ""}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openBlob(`/client/projects/${projectId}/invoices/${invoice._id}/pdf`, `${invoice.invoiceNumber || "invoice"}.pdf`)}
                      className="btn btn-secondary text-xs px-3 py-1.5"
                    >
                      <Download className="w-3.5 h-3.5" /> PDF
                    </button>
                    {invoice.status !== "paid" && (
                      <button onClick={() => payInvoice(invoice)} disabled={busy === `pay:${invoice._id}`} className="btn btn-primary text-xs px-4 py-1.5">
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>{busy === `pay:${invoice._id}` ? "Opening…" : "Pay Now"}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Shared Files & Notes Grid */}
        <section className="grid md:grid-cols-2 gap-5">
          <div className="card p-6 space-y-3">
            <h2 className="text-sm font-bold text-white dark:text-white light:text-slate-900 border-b border-slate-800 dark:border-slate-800 light:border-slate-200 pb-2">
              Shared Project Deliverables
            </h2>
            {files.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-500">No shared files available.</p>
            ) : (
              <ul className="space-y-2">
                {files.map((file) => (
                  <li
                    key={file._id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-slate-950/60 dark:bg-slate-950/60 light:bg-slate-50 border border-slate-800/80 dark:border-slate-800/80 light:border-slate-200 p-3"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white dark:text-white light:text-slate-900 truncate">{file.originalName}</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-400 light:text-slate-500">
                        v{file.version || 1} {file.createdAt ? ` · ${formatDate(file.createdAt)}` : ""}
                      </div>
                    </div>
                    <button
                      onClick={() => openBlob(`/client/projects/${projectId}/files/${file._id}/download`, file.originalName)}
                      className="btn btn-secondary text-xs py-1 px-3"
                    >
                      Download
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card p-6 space-y-3">
            <h2 className="text-sm font-bold text-white dark:text-white light:text-slate-900 border-b border-slate-800 dark:border-slate-800 light:border-slate-200 pb-2">
              Shared Notes & Specs
            </h2>
            {notes.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-500">No shared notes published.</p>
            ) : (
              <div className="space-y-2">
                {notes.map((note) => (
                  <details
                    key={note._id}
                    className="rounded-xl bg-slate-950/60 dark:bg-slate-950/60 light:bg-slate-50 border border-slate-800/80 dark:border-slate-800/80 light:border-slate-200 p-3 group"
                  >
                    <summary className="cursor-pointer text-xs font-bold text-white dark:text-white light:text-slate-900">{note.title}</summary>
                    <div className="text-xs text-slate-300 dark:text-slate-300 light:text-slate-700 whitespace-pre-wrap mt-2 leading-relaxed">
                      {note.content}
                    </div>
                  </details>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Messaging Section */}
        <section className="card p-6 space-y-4">
          <h2 className="text-sm font-bold text-white dark:text-white light:text-slate-900 flex items-center gap-2 border-b border-slate-800 dark:border-slate-800 light:border-slate-200 pb-3">
            <MessageSquare className="w-4 h-4 text-indigo-400" />
            <span>Direct Feedback & Discussion</span>
          </h2>
          {comments.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-500">No messages yet. Ask questions or leave feedback below.</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {comments.map((item) => (
                <div
                  key={item._id}
                  className={`rounded-2xl border p-3.5 text-xs space-y-1 ${
                    item.fromClient
                      ? "bg-indigo-500/10 border-indigo-500/30 ml-6"
                      : "bg-slate-950/60 dark:bg-slate-950/60 light:bg-slate-50 border-slate-800/80 mr-6"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-white dark:text-white light:text-slate-900">
                      {item.fromClient ? "You" : item.authorName || item.author?.name || "Freelancer"}
                    </span>
                    {item.createdAt && <span className="text-[10px] text-slate-400">{formatDate(item.createdAt)}</span>}
                  </div>
                  <div className="text-slate-300 dark:text-slate-300 light:text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {item.content}
                  </div>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={submitComment} className="space-y-3 pt-1">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="input text-xs"
              placeholder="Write a message to your freelancer…"
            />
            <div className="flex justify-end">
              <button disabled={busy === "comment" || !comment.trim()} className="btn btn-primary text-xs px-5 py-2">
                <Send className="w-3.5 h-3.5" />
                <span>{busy === "comment" ? "Sending…" : "Send Message"}</span>
              </button>
            </div>
          </form>
        </section>

        <footer className="text-center text-xs text-slate-500 dark:text-slate-500 light:text-slate-400 pt-4 pb-6 font-medium">
          Encrypted Client Portal · Powered by ClientSphere
        </footer>
      </main>
    </div>
  );
}