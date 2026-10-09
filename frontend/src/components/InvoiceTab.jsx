import React, { useState } from "react";
import toast from "react-hot-toast";
import { DollarSign, FileText, Download, Send, CheckCircle2, Clock, Edit2, Save, X } from "lucide-react";

const STATUS = {
  draft: { label: "Draft", chip: "bg-slate-500/10 text-slate-400 dark:text-slate-300 light:text-slate-700 border-slate-500/30" },
  sent: { label: "Sent", chip: "bg-indigo-500/10 text-indigo-400 dark:text-indigo-300 light:text-indigo-700 border-indigo-500/30" },
  overdue: { label: "Overdue", chip: "bg-rose-500/10 text-rose-400 dark:text-rose-300 light:text-rose-700 border-rose-500/30" },
  paid: { label: "Paid", chip: "bg-emerald-500/10 text-emerald-400 dark:text-emerald-300 light:text-emerald-700 border-emerald-500/30" },
};

const money = (amount, currency = "usd") => {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: String(currency || "usd").toUpperCase() }).format(Number(amount || 0));
  } catch {
    return `$${Number(amount || 0).toFixed(2)}`;
  }
};
const fmt = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "no due date");
const toInputDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");

function InvoiceRow({ invoice, onSend, onDownload, onSave }) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(invoice.amount ?? 0);
  const [dueDate, setDueDate] = useState(toInputDate(invoice.dueDate));
  const [busy, setBusy] = useState(false);
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

  const markPaid = () => {
    if (!window.confirm(`Mark ${invoice.invoiceNumber || "this invoice"} as paid? Use this for payments received outside ClientSphere.`)) return;
    return run(() => onSave?.(invoice._id, { status: "paid" }));
  };

  return (
    <div className="card p-5 space-y-4 hover:border-slate-700/80 transition-all">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="font-bold text-base text-white dark:text-white light:text-slate-900 flex items-center gap-2.5">
            <span>{invoice.invoiceNumber || "Invoice"}</span>
            <span className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border ${meta.chip}`}>
              {meta.label}
            </span>
          </div>
          <div className="text-xl font-extrabold text-white dark:text-white light:text-slate-900 tracking-tight">
            {money(invoice.amount, invoice.currency)}
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-500 font-medium">
            {invoice.status === "paid" && invoice.paidAt ? `Paid ${fmt(invoice.paidAt)}` : `Due ${fmt(invoice.dueDate)}`}
            {invoice.status === "draft" ? " · draft hidden from client" : ""}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <button onClick={() => onDownload?.(invoice._id)} className="btn btn-secondary text-xs px-3 py-2">
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>PDF</span>
          </button>

          {invoice.status === "draft" && (
            <button onClick={() => setEditing((e) => !e)} className="btn btn-secondary text-xs px-3 py-2" disabled={busy}>
              <Edit2 className="w-3.5 h-3.5" />
              <span>{editing ? "Close" : "Edit"}</span>
            </button>
          )}

          {(invoice.status === "sent" || invoice.status === "overdue") && (
            <button onClick={markPaid} className="btn btn-secondary text-xs px-3 py-2 text-emerald-400" disabled={busy}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Mark paid</span>
            </button>
          )}

          {invoice.status !== "paid" && (
            <button onClick={() => run(() => onSend?.(invoice._id))} className="btn btn-primary text-xs px-4 py-2" disabled={busy}>
              <Send className="w-3.5 h-3.5" />
              <span>{busy ? "Working…" : invoice.status === "draft" ? "Send to client" : "Resend"}</span>
            </button>
          )}
        </div>
      </div>

      {editing && (
        <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end border-t border-slate-800 dark:border-slate-800 light:border-slate-200 pt-4 animate-fadeIn">
          <label className="text-xs font-semibold text-slate-400 dark:text-slate-400 light:text-slate-600 space-y-1">
            <span>Amount</span>
            <input type="number" min="0" step="0.01" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
          <label className="text-xs font-semibold text-slate-400 dark:text-slate-400 light:text-slate-600 space-y-1">
            <span>Due date</span>
            <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </label>
          <button className="btn btn-primary text-xs px-5 py-2.5" onClick={saveEdit} disabled={busy}>
            <Save className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function InvoiceTab({ invoices = [], onSend, onDownload, onSave }) {
  const outstanding = invoices.filter((i) => i.status === "sent" || i.status === "overdue").reduce((s, i) => s + Number(i.amount || 0), 0);
  const paid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.amount || 0), 0);
  const drafts = invoices.filter((i) => i.status === "draft").length;

  if (invoices.length === 0) {
    return (
      <div className="card p-12 text-center text-slate-400 space-y-3">
        <div className="w-14 h-14 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <DollarSign className="w-7 h-7" />
        </div>
        <div className="text-base font-bold text-white dark:text-white light:text-slate-900">No invoices yet</div>
        <p className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-500 max-w-md mx-auto">
          When your client approves a milestone, a draft invoice automatically appears here for your review before sending.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400 light:text-slate-500">
            Outstanding
          </div>
          <div className="text-2xl font-extrabold text-amber-400 dark:text-amber-300 light:text-amber-600 tracking-tight">
            {money(outstanding)}
          </div>
        </div>

        <div className="card p-5 space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400 light:text-slate-500">
            Paid
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 dark:text-emerald-300 light:text-emerald-600 tracking-tight">
            {money(paid)}
          </div>
        </div>

        <div className="card p-5 space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400 light:text-slate-500">
            Drafts to review
          </div>
          <div className="text-2xl font-extrabold text-white dark:text-white light:text-slate-900 tracking-tight">
            {drafts}
          </div>
        </div>
      </div>

      {/* Invoice Cards */}
      <div className="space-y-4">
        {invoices.map((invoice) => (
          <InvoiceRow key={invoice._id} invoice={invoice} onSend={onSend} onDownload={onDownload} onSave={onSave} />
        ))}
      </div>
    </div>
  );
}