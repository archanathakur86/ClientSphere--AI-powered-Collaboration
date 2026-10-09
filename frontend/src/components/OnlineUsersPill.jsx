import React from "react";
import { Users } from "lucide-react";

export default function OnlineUsersPill({ users = [] }) {
  if (!users.length) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-[11px] font-semibold text-slate-500">
        <span className="w-2 h-2 rounded-full bg-slate-600" />
        <span>No active users</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {users.slice(0, 5).map((user) => (
        <span
          key={user.id}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 dark:text-emerald-300 light:text-emerald-700 text-xs font-semibold border border-emerald-500/30 shadow-sm"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          {user.name}
        </span>
      ))}
      {users.length > 5 && (
        <span className="text-xs font-semibold text-slate-400 dark:text-slate-400 light:text-slate-600">
          +{users.length - 5} more
        </span>
      )}
    </div>
  );
}
