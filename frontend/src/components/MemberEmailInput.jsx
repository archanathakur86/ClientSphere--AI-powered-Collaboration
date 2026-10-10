import React, { useEffect, useRef, useState } from "react";
import api from "../api/axios.js";

const initialsOf = (name = "") => name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";

// Email field with suggestions from registered users, like a mail app's recipient box.
// Only people with a ClientSphere account appear, and people already on the project are skipped.
export default function MemberEmailInput({ projectId, value, onChange, inputClassName }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const skipNextSearch = useRef(false);

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return undefined;
    }
    const q = value.trim();
    if (q.length < 3) {
      setItems([]);
      setOpen(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/projects/${projectId}/member-suggestions`, { params: { q } });
        if (cancelled) return;
        setItems(res.data.users || []);
        setActive(-1);
        setOpen(true);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value, projectId]);

  const pick = (user) => {
    skipNextSearch.current = true;
    onChange(user.email);
    setItems([]);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (!open || items.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      pick(items[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showEmpty = open && !loading && items.length === 0 && value.trim().length >= 3;

  return (
    <div className="relative">
      <input
        className={inputClassName}
        placeholder="teammate@email.com"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => items.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
      />

      {(open && items.length > 0) || showEmpty || loading ? (
        <div className="absolute z-20 left-0 right-0 mt-2 rounded-2xl bg-[#ffffff] border border-[#e8e2d9] shadow-[0_24px_50px_-24px_rgba(60,40,20,0.4)] overflow-hidden">
          {loading && items.length === 0 ? (
            <p className="px-4 py-3 text-xs text-[#a39c92]">Searching accounts…</p>
          ) : items.length === 0 ? (
            <p className="px-4 py-3 text-xs text-[#a39c92]">
              No ClientSphere account starts with "{value.trim()}". They need to sign up first.
            </p>
          ) : (
            <ul className="max-h-64 overflow-y-auto py-1" role="listbox">
              {items.map((u, i) => (
                <li key={u._id} role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(u)}
                    onMouseEnter={() => setActive(i)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      i === active ? "bg-[#faf7f2]" : "hover:bg-[#faf7f2]"
                    }`}
                  >
                    <span className="w-8 h-8 rounded-full bg-[#dcebe2] text-[#3f6e5b] text-[11px] font-bold flex items-center justify-center shrink-0">
                      {initialsOf(u.name)}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold truncate">{u.name}</span>
                      <span className="block text-[11px] text-[#a39c92] truncate">{u.email}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}