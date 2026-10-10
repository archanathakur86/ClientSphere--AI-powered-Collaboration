import React from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { PASSWORD_RULES } from "../utils/passwordPolicy.js";

export default function PasswordStrength({ value = "" }) {
  const results = PASSWORD_RULES.map((r) => ({ ...r, ok: r.test(value) }));
  const passed = results.filter((r) => r.ok).length;
  const total = PASSWORD_RULES.length;

  const level =
    passed <= 2
      ? { label: "Weak", bar: "bg-rose-400", text: "text-rose-500" }
      : passed === 3
      ? { label: "Fair", bar: "bg-amber-400", text: "text-amber-600" }
      : passed === 4
      ? { label: "Good", bar: "bg-cyan-400", text: "text-cyan-600" }
      : { label: "Strong", bar: "bg-emerald-500", text: "text-emerald-600" };

  return (
    <div className="mt-3 space-y-3">
      <div className="flex items-center gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
              value && i < passed ? level.bar : "bg-slate-800"
            }`}
          />
        ))}
      </div>
      <div className="flex justify-between text-[11px]">
        <span className="text-slate-400">Password strength</span>
        <span className={`font-semibold ${value ? level.text : "text-slate-500"}`}>{value ? level.label : "-"}</span>
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
        {results.map((r) => (
          <li
            key={r.id}
            className={`flex items-center gap-2 text-xs transition-colors ${r.ok ? "text-emerald-600" : "text-slate-500"}`}
          >
            {r.ok ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <Circle className="w-3.5 h-3.5 shrink-0" />}
            {r.label}
          </li>
        ))}
      </ul>
    </div>
  );
}