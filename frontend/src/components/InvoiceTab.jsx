import React, { useState } from "react";
import toast from "react-hot-toast";
import { FileDown, Pencil, Send, BadgeCheck, AlertTriangle, ReceiptText } from "lucide-react";

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,400;1,9..144,500&display=swap');

.iv-serif { font-family: 'Fraunces', Georgia, serif; font-weight: 500; letter-spacing: -0.02em; }

@keyframes ivIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes ivFade { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
.iv-card { animation: ivIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) backwards; }
.iv-in { animation: ivIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
.iv-fade { animation: ivFade 0.35s cubic-bezier(0.16, 1, 0.3, 1) both; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
`;

const STATUS = {
  draft: { label: "Draft", color: "#a39c92", tint: "#f1ece4", ink: "#6b655e" },
  sent: { label: "Sent", color: "#e0a46f", tint: "#f7ecc9", ink: "#8a6418" },
  overdue: { label: "Overdue", color: "#c4673f", tint: "#f9e1d6", ink: "#a4502d" },
  paid: { label: "Paid", color: "#3f6e5b", tint: "#dcebe2", ink: "#3f6e5b" },
};

const inputCls =
  "w-full px-4 py-3 bg-[#ffffff] border border-[#e8e2d9] rounded-2xl text-sm placeholder-[#a39c92] focus:outline-none focus:border-[#c4673f] focus:ring-2 focus:ring-[#f6dccb]";
const labelCls = "block text-[11px] font-semibold uppercase tracking-wider text-[#6b655e] mb-2";

const money = (amount, currency = "usd") => {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: String(currency || "usd").toUpperCase() }).format(Number(amount || 0));
  } catch {
    return `$${Number(amount || 0).toFixed(2)}`;
  }
};
const fmt = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "no due date");
const toInputDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");

const pillBtn =
  "inline-flex items-center gap-1.5 text-xs font-semibold border border-[#e8e2d9] bg-[#ffffff] text-[#1c1917] px-4 py-2 rounded-full hover:border-[#c4673f] hover:text-[#a4502d] transition-colors disabled:opacity-50";

function InvoiceRow({ invoice, index, onSend, onDownload, onSave }) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(invoice.amount ?? 0);
  const [dueDate, setDueDate] = useState(toInputDate(invoice.dueDate));
  const [busy, setBusy] = useState(false);
  const [confirmingPaid, setConfirmingPaid] = useState(false);
  const meta = STATUS[invoice.status] || STATUS.draft;

  const run = async (fn) => {
    setBusy(true);
    try {
      return await fn();
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = () => {
    const value = Number(amount);
    if (Number.isNaN(value) || value < 0) return toast.error("Amount must be 0 or more");
    return run(async () => {
      const ok = await onSave?.(invoice._id, { amount: value, dueDate: dueDate || null });
      if (ok) setEditing(false);
    });
  };

  const markPaid = () =>
    run(async () => {
      await onSave?.(invoice._id, { status: "paid" });
      setConfirmingPaid(false);
    });

  return (
    <article
      className="iv-card group relative rounded-[28px] bg-[#ffffff] border border-[#e8e2d9] overflow-hidden hover:shadow-[0_26px_56px_-34px_rgba(60,40,20,0.35)] transition-shadow duration-500"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <span className="absolute left-0 top-0 bottom-0 w-1.5" style={{ background: meta.color }} />

      <div className="pl-8 pr-6 py-6 flex flex-col lg:flex-row lg:items-center gap-6">
        {/* Identity */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[11px] font-mono text-[#6b655e] bg-[#f1ece4] px-2.5 py-1 rounded-full">
              {invoice.invoiceNumber || "INV-—"}
            </span>
            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full"
              style={{ background: meta.tint, color: meta.ink }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
              {meta.label}
            </span>
          </div>
          <p className="iv-serif text-4xl mt-4 tabular-nums leading-none">{money(invoice.amount, invoice.currency)}</p>
          <p className="text-xs text-[#6b655e] mt-3">
            {invoice.status === "paid" && invoice.paidAt ? `Paid ${fmt(invoice.paidAt)}` : `Due ${fmt(invoice.dueDate)}`}
            {invoice.status === "draft" ? " · the client can't see this yet" : ""}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <button onClick={() => onDownload?.(invoice._id)} className={pillBtn}>
            <FileDown className="w-3.5 h-3.5" /> PDF
          </button>
          {invoice.status === "draft" && (
            <button onClick={() => setEditing((e) => !e)} disabled={busy} className={pillBtn}>
              <Pencil className="w-3.5 h-3.5" /> {editing ? "Close" : "Edit"}
            </button>
          )}
          {(invoice.status === "sent" || invoice.status === "overdue") && (
            <button onClick={() => setConfirmingPaid((c) => !c)} disabled={busy} className={pillBtn}>
              <BadgeCheck className="w-3.5 h-3.5" /> Mark paid
            </button>
          )}
          {invoice.status !== "paid" && (
            <button
              onClick={() => run(() => onSend?.(invoice._id))}
              disabled={busy}
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#1c1917] text-[#faf7f2] px-4 py-2 rounded-full hover:bg-[#c4673f] transition-colors disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {busy ? "Working…" : invoice.status === "draft" ? "Send to client" : "Resend"}
            </button>
          )}
        </div>
      </div>

      {editing && (
        <div className="iv-fade mx-6 mb-6 ml-8 rounded-2xl bg-[#faf7f2] border border-[#e8e2d9] p-5 grid sm:grid-cols-[1fr_1fr_auto] gap-4 items-end">
          <label>
            <span className={labelCls}>Amount</span>
            <input type="number" min="0" step="0.01" className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
          <label>
            <span className={labelCls}>Due date</span>
            <input type="date" className={inputCls} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </label>
          <button
            onClick={saveEdit}
            disabled={busy}
            className="text-sm font-semibold bg-[#1c1917] text-[#faf7f2] px-6 py-3 rounded-full hover:bg-[#c4673f] transition-colors disabled:opacity-50"
          >
            Save
          </button>
        </div>
      )}

      {confirmingPaid && (
        <div className="iv-fade mx-6 mb-6 ml-8 rounded-2xl bg-[#dcebe2]/60 border border-[#bfe3cd] p-4 flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm text-[#2f4a3e]">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Mark {invoice.invoiceNumber || "this invoice"} as paid? Use this for payments received outside ClientSphere.
          </p>
          <div className="flex gap-2">
            <button
              onClick={markPaid}
              disabled={busy}
              className="text-xs font-semibold bg-[#3f6e5b] text-[#faf7f2] px-4 py-2 rounded-full hover:bg-[#2f6d50] transition-colors disabled:opacity-50"
            >
              Yes, mark paid
            </button>
            <button
              onClick={() => setConfirmingPaid(false)}
              className="text-xs font-semibold border border-[#e8e2d9] bg-[#ffffff] px-4 py-2 rounded-full hover:border-[#1c1917] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

export default function InvoiceTab({ invoices = [], onSend, onDownload, onSave }) {
  const outstanding = invoices.filter((i) => i.status === "sent" || i.status === "overdue").reduce((s, i) => s + Number(i.amount || 0), 0);
  const paid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.amount || 0), 0);
  const drafts = invoices.filter((i) => i.status === "draft").length;

  if (invoices.length === 0) {
    return (
      <div className="rounded-[32px] border-2 border-dashed border-[#d9d1c4] bg-[#ffffff] p-14 text-center">
        <style>{STYLES}</style>
        <div className="w-16 h-16 mx-auto rounded-2xl bg-[#f7ecc9] flex items-center justify-center">
          <ReceiptText className="w-7 h-7 text-[#8a6418]" />
        </div>
        <h3 className="iv-serif text-4xl mt-7">No invoices yet</h3>
        <p className="mt-3 text-sm text-[#6b655e] max-w-md mx-auto leading-relaxed">
          When your client approves a milestone, a draft invoice appears here for you to review and send.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <style>{STYLES}</style>

      {/* Ledger summary */}
      <div className="iv-in grid md:grid-cols-3 gap-4">
        <div className="rounded-[28px] bg-[#f7ecc9]/70 border border-[#efd9a0] p-6">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#8a6418] font-semibold">Outstanding</p>
          <p className="iv-serif text-5xl mt-3 tabular-nums text-[#5c3f0d]">{money(outstanding)}</p>
          <p className="text-xs text-[#8a6418] mt-2">Sent and waiting on payment</p>
        </div>
        <div className="rounded-[28px] bg-[#dcebe2]/70 border border-[#bfe3cd] p-6">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#3f6e5b] font-semibold">Collected</p>
          <p className="iv-serif text-5xl mt-3 tabular-nums text-[#22523c]">{money(paid)}</p>
          <p className="text-xs text-[#3f6e5b] mt-2">Paid so far</p>
        </div>
        <div className="rounded-[28px] bg-[#ffffff] border border-[#e8e2d9] p-6">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#6b655e] font-semibold">Drafts</p>
          <p className="iv-serif text-5xl mt-3 tabular-nums">{drafts}</p>
          <p className="text-xs text-[#6b655e] mt-2">To review before sending</p>
        </div>
      </div>

      <div className="flex items-end justify-between">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[#6b655e]">Ledger</p>
        <p className="text-xs text-[#6b655e]">{invoices.length} invoice{invoices.length === 1 ? "" : "s"}</p>
      </div>

      <div className="space-y-4">
        {invoices.map((invoice, i) => (
          <InvoiceRow key={invoice._id} invoice={invoice} index={i} onSend={onSend} onDownload={onDownload} onSave={onSave} />
        ))}
      </div>
    </div>
  );
}