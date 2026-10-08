import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import api, { clearPortalSession, PORTAL_SESSION_EXPIRED } from "../api/axios.js";
import { useRealtime } from "../hooks/useRealtime.js";
import NotificationBell from "../components/NotificationBell.jsx";
import OnlineUsersPill from "../components/OnlineUsersPill.jsx";

const money = (amount, currency = "usd") => {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: String(currency || "usd").toUpperCase() }).format(Number(amount || 0));
  } catch {
    return `$${Number(amount || 0).toFixed(2)}`;
  }
};

const formatDate = (value) => (value ? new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "");

const MILESTONE_STATUS = {
  pending: { label: "Upcoming", chip: "bg-slate-500/10 text-slate-300 border-slate-500/30", hint: "The freelancer hasn't submitted this yet." },
  "in review": { label: "Needs your review", chip: "bg-amber-500/10 text-amber-300 border-amber-500/30", hint: "" },
  "changes requested": { label: "Changes requested", chip: "bg-orange-500/10 text-orange-300 border-orange-500/30", hint: "Waiting for the freelancer to revise this." },
  approved: { label: "Approved", chip: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30", hint: "" },
};

const INVOICE_STATUS = {
  sent: "bg-indigo-500/10 text-indigo-300 border-indigo-500/30",
  overdue: "bg-red-500/10 text-red-300 border-red-500/30",
  paid: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
};

const Chip = ({ className, children }) => (
  <span className={`text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full border whitespace-nowrap ${className}`}>{children}</span>
);

const Screen = ({ title, children }) => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
    <div className="card max-w-md w-full text-center space-y-3">
      <div className="text-xs uppercase tracking-widest text-indigo-400 font-semibold">ClientSphere</div>
      <h1 className="text-xl font-bold text-white">{title}</h1>
      <div className="text-sm text-slate-400 space-y-3">{children}</div>
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
          // This re-runs the effect, which then loads the portal with the stored session.
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
    return <div className="min-h-screen flex items-center justify-center text-slate-400 bg-slate-950">Opening your portal…</div>;
  }

  if (status === "needs-link") {
    return (
      <Screen title="Open the link from your invitation">
        <p>This portal is private. Use the secure link in the email your freelancer sent you to get in.</p>
        <p className="text-slate-500">Can't find it? Ask them to send a new invitation.</p>
        <Link to="/" className="inline-block text-indigo-300 hover:text-white text-sm">Learn about ClientSphere</Link>
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
        <button className="btn btn-primary text-sm" onClick={() => window.location.reload()}>Try again</button>
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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-widest text-indigo-400 font-semibold">Client Portal</div>
            <h1 className="text-xl sm:text-2xl font-bold mt-1 truncate">{portal.project.name}</h1>
            {portal.project.description && <p className="text-sm text-slate-400 line-clamp-1">{portal.project.description}</p>}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="hidden sm:block text-right text-xs text-slate-400">
              <div className="text-slate-200">{portal.project.clientName || "Client"}</div>
              <button onClick={signOut} className="hover:text-white underline-offset-2 hover:underline">Sign out</button>
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

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {(awaitingReview > 0 || unpaid.length > 0) && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200 space-y-1">
            {awaitingReview > 0 && (
              <div>
                {awaitingReview} milestone{awaitingReview > 1 ? "s are" : " is"} waiting for your review.
              </div>
            )}
            {unpaid.length > 0 && (
              <div>
                {unpaid.length} invoice{unpaid.length > 1 ? "s are" : " is"} awaiting payment.
              </div>
            )}
          </div>
        )}

        <section className="card">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">Progress</div>
              <div className="text-2xl font-bold mt-1">{progress}% complete</div>
            </div>
            <OnlineUsersPill users={realtime.onlineUsers || []} />
          </div>
          <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </section>

        <section className="card">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-sm font-semibold">Latest update</h2>
            {portal.weeklyUpdateSentAt && <span className="text-xs text-slate-500">{formatDate(portal.weeklyUpdateSentAt)}</span>}
          </div>
          {portal.weeklyUpdate ? (
            <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{portal.weeklyUpdate}</p>
          ) : (
            <p className="text-sm text-slate-500">Your freelancer hasn't sent a progress update yet. It will appear here.</p>
          )}
        </section>

        <section className="card">
          <h2 className="text-sm font-semibold mb-4">Milestones</h2>
          {milestones.length === 0 ? (
            <p className="text-sm text-slate-500">No milestones have been added yet.</p>
          ) : (
            <div className="space-y-4">
              {milestones.map((m) => {
                const meta = MILESTONE_STATUS[m.status] || MILESTONE_STATUS.pending;
                const history = m.changeRequests || [];
                return (
                  <div key={m._id} className="rounded-2xl bg-slate-950 border border-slate-800 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-white">{m.title}</div>
                        {m.description && <div className="text-sm text-slate-400 mt-1 whitespace-pre-wrap">{m.description}</div>}
                      </div>
                      <Chip className={meta.chip}>{meta.label}</Chip>
                    </div>
                    <div className="flex items-center justify-between mt-3 text-xs text-slate-400">
                      <span>{m.dueDate ? `Due ${formatDate(m.dueDate)}` : "No due date"}</span>
                      <span className="text-slate-200 font-medium">{money(m.amount)}</span>
                    </div>

                    {history.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {history.map((h, i) => (
                          <div key={i} className="text-xs rounded-lg bg-slate-900 border border-slate-800 p-2.5 text-slate-300">
                            <span className="text-orange-300 font-medium">You asked for changes{h.createdAt ? ` · ${formatDate(h.createdAt)}` : ""}: </span>
                            {h.comment}
                          </div>
                        ))}
                      </div>
                    )}

                    {m.status === "in review" && (
                      <div className="mt-4">
                        {changeFor === m._id ? (
                          <div className="space-y-2">
                            <textarea
                              value={changeText}
                              onChange={(e) => setChangeText(e.target.value)}
                              rows={3}
                              autoFocus
                              className="input"
                              placeholder="What should be changed?"
                            />
                            <div className="flex gap-2">
                              <button onClick={() => sendChangeRequest(m)} disabled={busy === `changes:${m._id}`} className="btn btn-primary text-xs py-2">
                                {busy === `changes:${m._id}` ? "Sending…" : "Send change request"}
                              </button>
                              <button onClick={() => { setChangeFor(null); setChangeText(""); }} className="btn btn-secondary text-xs py-2">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button onClick={() => approveMilestone(m)} disabled={Boolean(busy)} className="btn btn-primary text-xs py-2">
                              {busy === `approve:${m._id}` ? "Approving…" : "Approve"}
                            </button>
                            <button onClick={() => { setChangeFor(m._id); setChangeText(""); }} disabled={Boolean(busy)} className="btn btn-secondary text-xs py-2">Request changes</button>
                          </div>
                        )}
                      </div>
                    )}
                    {m.status === "approved" && m.approvedAt && <div className="mt-3 text-xs text-emerald-300">Approved on {formatDate(m.approvedAt)}</div>}
                    {meta.hint && m.status !== "in review" && m.status !== "approved" && <div className="mt-3 text-xs text-slate-500">{meta.hint}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="card">
          <h2 className="text-sm font-semibold mb-4">Invoices</h2>
          {invoices.length === 0 ? (
            <p className="text-sm text-slate-500">No invoices yet. They appear here once the freelancer sends one.</p>
          ) : (
            <div className="space-y-3">
              {invoices.map((invoice) => (
                <div key={invoice._id} className="rounded-xl bg-slate-950 border border-slate-800 p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      {invoice.invoiceNumber || "Invoice"}
                      <Chip className={INVOICE_STATUS[invoice.status] || INVOICE_STATUS.sent}>{invoice.status}</Chip>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {money(invoice.amount, invoice.currency)}
                      {invoice.dueDate && invoice.status !== "paid" ? ` · due ${formatDate(invoice.dueDate)}` : ""}
                      {invoice.paidAt ? ` · paid ${formatDate(invoice.paidAt)}` : ""}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openBlob(`/client/projects/${projectId}/invoices/${invoice._id}/pdf`, `${invoice.invoiceNumber || "invoice"}.pdf`)}
                      className="btn btn-secondary text-xs py-2"
                    >
                      PDF
                    </button>
                    {invoice.status !== "paid" && (
                      <button onClick={() => payInvoice(invoice)} disabled={busy === `pay:${invoice._id}`} className="btn btn-primary text-xs py-2">
                        {busy === `pay:${invoice._id}` ? "Opening…" : "Pay now"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="grid md:grid-cols-2 gap-4">
          <div className="card">
            <h2 className="text-sm font-semibold mb-3">Shared files</h2>
            {files.length === 0 ? (
              <p className="text-sm text-slate-500">No files have been shared with you yet.</p>
            ) : (
              <ul className="space-y-2">
                {files.map((file) => (
                  <li key={file._id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-950 border border-slate-800 px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-sm text-slate-200 truncate">{file.originalName}</div>
                      <div className="text-[11px] text-slate-500">
                        v{file.version || 1}
                        {file.createdAt ? ` · ${formatDate(file.createdAt)}` : ""}
                      </div>
                    </div>
                    <button onClick={() => openBlob(`/client/projects/${projectId}/files/${file._id}/download`, file.originalName)} className="btn btn-secondary text-xs py-1.5">
                      Open
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold mb-3">Shared notes</h2>
            {notes.length === 0 ? (
              <p className="text-sm text-slate-500">No notes have been shared with you yet.</p>
            ) : (
              <div className="space-y-2">
                {notes.map((note) => (
                  <details key={note._id} className="rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 group">
                    <summary className="cursor-pointer text-sm font-medium text-slate-200">{note.title}</summary>
                    <div className="text-sm text-slate-400 whitespace-pre-wrap mt-2 leading-relaxed">{note.content}</div>
                  </details>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="card">
          <h2 className="text-sm font-semibold mb-4">Conversation</h2>
          {comments.length === 0 ? (
            <p className="text-sm text-slate-500 mb-4">No messages yet. Questions and feedback go here.</p>
          ) : (
            <div className="space-y-3 mb-4 max-h-96 overflow-y-auto pr-1">
              {comments.map((item) => (
                <div
                  key={item._id}
                  className={`rounded-xl border p-3 text-sm ${item.fromClient ? "bg-indigo-500/10 border-indigo-500/20 ml-6" : "bg-slate-950 border-slate-800 mr-6"}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-semibold text-white">{item.fromClient ? "You" : item.authorName || item.author?.name || "Freelancer"}</span>
                    {item.createdAt && <span className="text-[11px] text-slate-500">{formatDate(item.createdAt)}</span>}
                  </div>
                  <div className="text-slate-300 whitespace-pre-wrap">{item.content}</div>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={submitComment} className="space-y-3">
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} className="input" placeholder="Write a message to your freelancer…" />
            <button disabled={busy === "comment" || !comment.trim()} className="btn btn-primary text-sm">
              {busy === "comment" ? "Sending…" : "Send message"}
            </button>
          </form>
        </section>

        <footer className="text-center text-xs text-slate-600 pt-2 pb-6">Secure client portal · Powered by ClientSphere</footer>
      </main>
    </div>
  );
}