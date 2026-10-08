import React from "react";

export default function OnlineUsersPill({ users = [] }) {
  if (!users.length) {
    return <div className="text-xs text-slate-500">Nobody online right now</div>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {users.slice(0, 5).map((user) => (
        <span key={user.id} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 text-xs border border-emerald-500/20">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          {user.name}
        </span>
      ))}
      {users.length > 5 && <span className="text-xs text-slate-400">+{users.length - 5} more</span>}
    </div>
  );
}
