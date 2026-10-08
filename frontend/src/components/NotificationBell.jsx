import React, { useState } from "react";
import { Bell, CheckCheck, Dot } from "lucide-react";

export default function NotificationBell({ notifications = [], unreadCount = 0, onMarkRead, onMarkAllRead }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((current) => !current)}
        className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all relative"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-indigo-500 text-white text-[10px] flex items-center justify-center">{unreadCount}</span>}
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-white uppercase tracking-wider">Notifications</div>
              <div className="text-[11px] text-slate-400">Milestones, comments, invoices</div>
            </div>
            <button onClick={onMarkAllRead} className="text-xs text-indigo-300 hover:text-white flex items-center gap-1">
              <CheckCheck className="w-4 h-4" /> Mark all read
            </button>
          </div>
          <div className="divide-y divide-slate-800/60 max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-sm text-slate-500">You’re all caught up.</div>
            ) : (
              notifications.map((item) => (
                <button
                  key={item._id}
                  onClick={() => onMarkRead?.(item._id)}
                  className={`w-full text-left p-4 hover:bg-slate-850 transition-colors ${item.readAt ? "opacity-65" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-indigo-300">{item.title}</span>
                    {!item.readAt && <Dot className="w-5 h-5 text-indigo-400 shrink-0" />}
                  </div>
                  <p className="text-xs text-slate-300 mt-1">{item.message}</p>
                  <p className="text-[10px] text-slate-500 mt-2">{new Date(item.createdAt).toLocaleString()}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
