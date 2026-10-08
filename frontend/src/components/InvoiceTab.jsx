import React, { useState } from "react";
import toast from "react-hot-toast";

const STATUS = {
  draft: { label: "Draft", chip: "bg-slate-500/10 text-slate-300 border-slate-500/30" },
  sent: { label: "Sent", chip: "bg-indigo-500/10 text-indigo-300 border-indigo-500/30" },
  overdue: { label: "Overdue", chip: "bg-red-500/10 text-red-300 border-red-500/30" },
  paid: { label: "Paid", chip: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" },
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
    <div className="card space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-semibold flex items-center gap-2">
            {invoice.invoiceNumber || "Invoice"}
            <span className={`text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full border ${meta.chip}`}>{meta.label}</span>
          </div>
          <div className="text-sm text-slate-300 mt-1">{money(invoice.amount, invoice.currency)}</div>
          <div className="text-xs text-slate-500 mt-0.5">
            {invoice.status === "paid" && invoice.paidAt ? `Paid ${fmt(invoice.paidAt)}` : `Due ${fmt(invoice.dueDate)}`}
            {invoice.status === "draft" ? " · the client can't see this yet" : ""}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={() => onDownload?.(invoice._id)} className="btn btn-secondary text-xs py-2">PDF</button>
          {invoice.status === "draft" && (
            <button onClick={() => setEditing((e) => !e)} className="btn btn-secondary text-xs py-2" disabled={busy}>{editing ? "Close" : "Edit"}</button>
          )}
          {(invoice.status === "sent" || invoice.status === "overdue") && (
            <button onClick={markPaid} className="btn btn-secondary text-xs py-2" disabled={busy}>Mark paid</button>
          )}
          {invoice.status !== "paid" && (
            <button onClick={() => run(() => onSend?.(invoice._id))} className="btn btn-primary text-xs py-2" disabled={busy}>
              {busy ? "Working…" : invoice.status === "draft" ? "Send to client" : "Resend"}
            </button>
          )}
        </div>
      </div>

      {editing && (
        <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end border-t border-slate-800 pt-3">
          <label className="text-xs text-slate-400 space-y-1">
            <span>Amount</span>
            <input type="number" min="0" step="0.01" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
          <label className="text-xs text-slate-400 space-y-1">
            <span>Due date</span>
            <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </label>
          <button className="btn btn-primary text-sm" onClick={saveEdit} disabled={busy}>Save</button>
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
      <div className="card text-center py-10 text-slate-400 space-y-1">
        <div className="text-white font-semibold">No invoices yet</div>
        <p className="text-sm">When your client approves a milestone, a draft invoice appears here for you to review and send.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="card py-4">
          <div className="text-xs uppercase tracking-wide text-slate-400">Outstanding</div>
          <div className="text-xl font-bold mt-1 text-amber-300">{money(outstanding)}</div>
        </div>
        <div className="card py-4">
          <div className="text-xs uppercase tracking-wide text-slate-400">Paid</div>
          <div className="text-xl font-bold mt-1 text-emerald-300">{money(paid)}</div>
        </div>
        <div className="card py-4">
          <div className="text-xs uppercase tracking-wide text-slate-400">Drafts to review</div>
          <div className="text-xl font-bold mt-1">{drafts}</div>
        </div>
      </div>
      {invoices.map((invoice) => (
        <InvoiceRow key={invoice._id} invoice={invoice} onSend={onSend} onDownload={onDownload} onSave={onSave} />
      ))}
    </div>
  );
}