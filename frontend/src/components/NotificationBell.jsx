import React, { useState } from "react";
import { Bell, CheckCheck, Dot } from "lucide-react";

export default function NotificationBell({ notifications = [], unreadCount = 0, onMarkRead, onMarkAllRead }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((current) => !current)}
        className="p-2 rounded-xl bg-slate-900/90 dark:bg-slate-900/90 light:bg-white border border-slate-800/80 dark:border-slate-800/80 light:border-slate-200 text-slate-400 dark:text-slate-400 light:text-slate-700 hover:text-white dark:hover:text-white light:hover:text-slate-900 hover:border-slate-700 transition-all relative shadow-sm"
        title="Notifications"
      >
        <Bell className="w-4.5 h-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center shadow-lg shadow-indigo-500/50">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-slate-900/95 dark:bg-slate-900/95 light:bg-white border border-slate-800/90 dark:border-slate-800/90 light:border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl animate-fadeIn">
          <div className="p-4 border-b border-slate-800/80 dark:border-slate-800/80 light:border-slate-200 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-white dark:text-white light:text-slate-900 uppercase tracking-wider">
                Notifications
              </div>
              <div className="text-[11px] text-slate-400 dark:text-slate-400 light:text-slate-500">
                Milestones, approvals & comments
              </div>
            </div>
            <button
              onClick={onMarkAllRead}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              <CheckCheck className="w-4 h-4" /> Mark all read
            </button>
          </div>
          <div className="divide-y divide-slate-800/60 dark:divide-slate-800/60 light:divide-slate-200 max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 dark:text-slate-400 light:text-slate-500">
                You’re all caught up! No unread notifications.
              </div>
            ) : (
              notifications.map((item) => (
                <button
                  key={item._id}
                  onClick={() => onMarkRead?.(item._id)}
                  className={`w-full text-left p-4 hover:bg-slate-800/50 dark:hover:bg-slate-800/50 light:hover:bg-slate-50 transition-colors ${
                    item.readAt ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-indigo-400 dark:text-indigo-300 light:text-indigo-600">
                      {item.title}
                    </span>
                    {!item.readAt && <Dot className="w-5 h-5 text-indigo-500 shrink-0" />}
                  </div>
                  <p className="text-xs text-slate-300 dark:text-slate-300 light:text-slate-700 mt-1 leading-relaxed">
                    {item.message}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-400 light:text-slate-500 mt-2 font-medium">
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
