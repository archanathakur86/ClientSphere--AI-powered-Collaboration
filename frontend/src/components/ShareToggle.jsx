import React, { useState } from "react";
import { Eye, Lock } from "lucide-react";

// One control for "is this visible to the client?", used on notes, files and comments.
// Without `onChange` (or when `disabled`) it renders as a read-only badge, which is what
// viewers and commentors get.
export default function ShareToggle({ shared, onChange, disabled = false }) {
  const [busy, setBusy] = useState(false);
  const interactive = Boolean(onChange) && !disabled;

  const tone = shared
    ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
    : "bg-slate-800 text-slate-400 border-slate-700";
  const base = `inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${tone}`;
  const Icon = shared ? Eye : Lock;
  const label = busy ? "Saving…" : shared ? "Shared with client" : "Internal";

  if (!interactive) {
    return (
      <span className={base}>
        <Icon className="w-3 h-3" />
        {label}
      </span>
    );
  }

  const click = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onChange(!shared);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={click}
      disabled={busy}
      aria-pressed={shared}
      title={shared ? "The client can see this. Click to make it internal." : "Only your team can see this. Click to share it with the client."}
      className={`${base} hover:brightness-125 transition disabled:opacity-60`}
    >
      <Icon className="w-3 h-3" />
      {label}
    </button>
  );
}