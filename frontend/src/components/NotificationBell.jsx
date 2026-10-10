import React, { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";

const NB_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500&display=swap');
.nb-serif { font-family: 'Fraunces', Georgia, serif; font-weight: 500; letter-spacing: -0.02em; }
@keyframes nbIn { from { opacity: 0; transform: translateY(-6px) scale(0.98); } to { opacity: 1; transform: none; } }
.nb-pop { animation: nbIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) both; transform-origin: top right; }
`;

export default function NotificationBell({ notifications = [], unreadCount = 0, onMarkRead, onMarkAllRead }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  // Close when the user clicks anywhere outside the bell + panel, or presses Escape.
  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={wrapperRef}>
      <style>{NB_STYLES}</style>

      <button
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label="Notifications"
        className="relative w-10 h-10 rounded-full bg-[#ffffff] border border-[#e8e2d9] flex items-center justify-center hover:border-[#1c1917] transition-colors"
        title="Notifications"
      >
        <Bell className="w-4.5 h-4.5 text-[#1c1917]" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 rounded-full bg-[#c4673f] text-[#faf7f2] text-[10px] font-semibold flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="nb-pop absolute right-0 mt-3 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-[#ffffff] border border-[#e8e2d9] rounded-3xl shadow-[0_30px_70px_-25px_rgba(60,40,20,0.35)] z-50 overflow-hidden">
          <div className="px-5 py-4 border-b border-[#e8e2d9] flex items-center justify-between gap-3">
            <div>
              <p className="nb-serif text-xl text-[#1c1917]">Notifications</p>
              <p className="text-[11px] text-[#6b655e] mt-0.5">Milestones, comments, invoices</p>
            </div>
            <button
              onClick={onMarkAllRead}
              className="text-xs font-semibold text-[#c4673f] hover:text-[#1c1917] flex items-center gap-1 transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
          </div>

          <div className="divide-y divide-[#e8e2d9] max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <p className="nb-serif text-lg text-[#1c1917]">You're all caught up.</p>
                <p className="text-xs text-[#6b655e] mt-1">New activity from clients will appear here.</p>
              </div>
            ) : (
              notifications.map((item) => (
                <button
                  key={item._id}
                  onClick={() => onMarkRead?.(item._id)}
                  className={`w-full text-left px-5 py-4 transition-colors hover:bg-[#faf7f2] ${
                    item.readAt ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm font-semibold text-[#1c1917]">{item.title}</span>
                    {!item.readAt && <span className="mt-1.5 w-2 h-2 rounded-full bg-[#c4673f] shrink-0" />}
                  </div>
                  <p className="text-xs text-[#6b655e] mt-1 leading-relaxed">{item.message}</p>
                  <p className="text-[10px] text-[#a39c92] mt-2">{new Date(item.createdAt).toLocaleString()}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}