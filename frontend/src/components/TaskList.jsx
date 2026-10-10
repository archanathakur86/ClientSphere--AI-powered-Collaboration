import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../api/axios.js";
import { Check, X, Flag, Plus, AlertTriangle } from "lucide-react";

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,400;1,9..144,500&display=swap');

.tk-serif { font-family: 'Fraunces', Georgia, serif; font-weight: 500; letter-spacing: -0.02em; }

@keyframes tkIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes tkFade { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
@keyframes tkPop { 0% { transform: scale(0.6); } 60% { transform: scale(1.15); } 100% { transform: scale(1); } }
.tk-card { animation: tkIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) backwards; }
.tk-fade { animation: tkFade 0.35s cubic-bezier(0.16, 1, 0.3, 1) both; }
.tk-pop { animation: tkPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
`;

const STATUS_OPTIONS = [
  { value: "todo", label: "To do" },
  { value: "in-progress", label: "In progress" },
  { value: "done", label: "Done" },
];

const PRIORITY_OPTIONS = [
  { value: "high", label: "High", color: "#c4673f", tint: "#f9e1d6", ink: "#a4502d" },
  { value: "medium", label: "Medium", color: "#e0a46f", tint: "#f7ecc9", ink: "#8a6418" },
  { value: "low", label: "Low", color: "#86b99f", tint: "#dcebe2", ink: "#3f6e5b" },
];

const FILTERS = [{ value: "all", label: "All" }, ...STATUS_OPTIONS];

const priorityMeta = (value) => PRIORITY_OPTIONS.find((p) => p.value === value) || PRIORITY_OPTIONS[1];

const inputCls =
  "w-full px-4 py-3 bg-[#ffffff] border border-[#e8e2d9] rounded-2xl text-sm placeholder-[#a39c92] focus:outline-none focus:border-[#c4673f] focus:ring-2 focus:ring-[#f6dccb]";

const initialsOf = (name = "") =>
  name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

// @mention style picker: type a name or email, pick a project member.
function MemberPicker({ members, value, onChange }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const matches = members.filter((m) => {
    const q = query.replace(/^@/, "").toLowerCase();
    if (!q) return true;
    return m.name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q);
  });

  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[#faf7f2] border border-[#e8e2d9] rounded-2xl">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-7 h-7 rounded-full bg-[#dcebe2] text-[#3f6e5b] text-[11px] font-bold flex items-center justify-center shrink-0">
            {initialsOf(value.name)}
          </span>
          <span className="text-sm font-semibold truncate">{value.name}</span>
          <span className="text-[11px] text-[#a39c92] truncate hidden sm:inline">{value.email}</span>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="w-6 h-6 rounded-full hover:bg-[#f1ece4] flex items-center justify-center"
          aria-label="Remove assignee"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        className={inputCls}
        placeholder="Assign to: type a name or @"
        value={query}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && open && matches.length > 0) {
            e.preventDefault();
            onChange(matches[0]);
            setQuery("");
          }
          if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && (
        <div className="tk-fade absolute z-20 left-0 right-0 mt-2 rounded-2xl bg-[#ffffff] border border-[#e8e2d9] shadow-[0_24px_50px_-24px_rgba(60,40,20,0.4)] overflow-hidden">
          {members.length === 0 ? (
            <p className="px-4 py-3 text-xs text-[#a39c92]">No project members yet. Invite a teammate first.</p>
          ) : matches.length === 0 ? (
            <p className="px-4 py-3 text-xs text-[#a39c92]">No member matches "{query.replace(/^@/, "")}"</p>
          ) : (
            <ul className="max-h-60 overflow-y-auto py-1">
              {matches.map((m) => (
                <li key={m._id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onChange(m);
                      setQuery("");
                      setOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[#faf7f2] transition-colors"
                  >
                    <span className="w-8 h-8 rounded-full bg-[#f6dccb] text-[#a4502d] text-[11px] font-bold flex items-center justify-center shrink-0">
                      {initialsOf(m.name)}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold truncate">{m.name}</span>
                      <span className="block text-[11px] text-[#a39c92] truncate">{m.email}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function TaskComposer({ projectId, onCreated }) {
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState(null);
  const [members, setMembers] = useState([]);
  const [priority, setPriority] = useState("medium");
  const [saving, setSaving] = useState(false);
  const [titleError, setTitleError] = useState(false);

  useEffect(() => {
    api
      .get(`/projects/${projectId}/assignable-members`)
      .then((res) => setMembers(res.data.members || []))
      .catch(() => setMembers([]));
  }, [projectId]);

  const submit = async () => {
    if (!title.trim()) {
      setTitleError(true);
      toast.error("Task title is required");
      return;
    }
    setSaving(true);
    try {
      const res = await api.post(`/projects/${projectId}/tasks`, {
        title: title.trim(),
        priority,
        assignee: assignee?._id || null,
      });
      onCreated(res.data.task);
      toast.success(assignee ? `Task added and assigned to ${assignee.name}` : "Task added");
      setTitle("");
      setAssignee(null);
      setPriority("medium");
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't add the task");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="tk-card rounded-[28px] bg-[#ffffff] border border-[#e8e2d9] p-6 md:p-7 shadow-[0_24px_60px_-45px_rgba(60,40,20,0.35)]">
      <p className="text-[11px] uppercase tracking-[0.22em] text-[#c4673f]">New task</p>
      <div className="mt-4 flex flex-col lg:flex-row gap-3">
        <input
          className={`${inputCls} flex-1 text-base ${titleError ? "border-[#b4475a]" : ""}`}
          placeholder="What needs to get done?"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (e.target.value.trim()) setTitleError(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !saving) submit();
          }}
        />
        <div className="lg:w-72">
          <MemberPicker members={members} value={assignee} onChange={setAssignee} />
        </div>
      </div>
      {titleError && <p className="mt-2 text-xs font-semibold text-[#b4475a]">Task title is required.</p>}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex p-1 rounded-full bg-[#f1ece4]">
          {PRIORITY_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setPriority(o.value)}
              className={`text-[11px] font-semibold px-3.5 py-1.5 rounded-full transition-all duration-300 ${
                priority === o.value ? "bg-[#ffffff] text-[#1c1917] shadow-sm" : "text-[#6b655e] hover:text-[#1c1917]"
              }`}
            >
              <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: o.color }} />
              {o.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="inline-flex items-center gap-2 text-sm font-semibold bg-[#1c1917] text-[#faf7f2] pl-3 pr-5 py-2.5 rounded-full hover:bg-[#c4673f] transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          {saving ? "Adding…" : "Add task"}
        </button>
      </div>
    </div>
  );
}

export default function TaskList({ projectId }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [savingIds, setSavingIds] = useState(() => new Set());
  const [confirmingId, setConfirmingId] = useState(null);

  const loadTasks = async () => {
    try {
      const res = await api.get(`/projects/${projectId}/tasks`);
      setTasks(res.data.tasks);
    } catch (err) {
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const setSaving = (id, isSaving) =>
    setSavingIds((prev) => {
      const next = new Set(prev);
      if (isSaving) next.add(id);
      else next.delete(id);
      return next;
    });

  // Updates the UI immediately, then confirms with the server; rolls back on failure.
  // The row's controls are disabled while a save is in flight, so edits can't overlap.
  const updateTask = async (task, changes) => {
    setTasks((prev) => prev.map((t) => (t._id === task._id ? { ...t, ...changes } : t)));
    setSaving(task._id, true);
    try {
      const res = await api.patch(`/tasks/${task._id}`, changes);
      setTasks((prev) => prev.map((t) => (t._id === task._id ? res.data.task : t)));
    } catch (err) {
      setTasks((prev) => prev.map((t) => (t._id === task._id ? task : t)));
      toast.error(err.response?.data?.message || "Failed to update task");
    } finally {
      setSaving(task._id, false);
    }
  };

  const deleteTask = async (id) => {
    try {
      await api.delete(`/tasks/${id}`);
      setTasks((prev) => prev.filter((t) => t._id !== id));
      toast.success("Task deleted");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete task");
    } finally {
      setConfirmingId(null);
    }
  };

  const composer = (
    <TaskComposer projectId={projectId} onCreated={(task) => setTasks((prev) => [task, ...prev])} />
  );

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="h-36 rounded-[32px] bg-[#f1ece4] animate-pulse" />
        <div className="h-20 rounded-[24px] bg-[#f1ece4] animate-pulse" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="space-y-6">
        <style>{STYLES}</style>
        {composer}
        <div className="rounded-[32px] border-2 border-dashed border-[#d9d1c4] bg-[#ffffff] p-12 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#efe6f0] flex items-center justify-center">
            <Check className="w-7 h-7 text-[#6e4a78]" strokeWidth={2.5} />
          </div>
          <h3 className="tk-serif text-4xl mt-7">No tasks yet</h3>
          <p className="mt-3 text-sm text-[#6b655e] max-w-md mx-auto leading-relaxed">
            Add one above, or use "Extract tasks" on any note to turn action items into tasks automatically.
          </p>
        </div>
      </div>
    );
  }

  const countOf = (value) => (value === "all" ? tasks.length : tasks.filter((t) => t.status === value).length);
  const doneCount = countOf("done");
  const percentDone = Math.round((doneCount / tasks.length) * 100);
  const visible = filter === "all" ? tasks : tasks.filter((t) => t.status === filter);

  // Progress ring geometry
  const r = 40;
  const c = 2 * Math.PI * r;

  return (
    <div className="space-y-6">
      <style>{STYLES}</style>
      {composer}

      {/* Summary */}
      <div className="tk-card rounded-[32px] bg-[#ffffff] border border-[#e8e2d9] p-7 md:p-9 flex flex-col md:flex-row md:items-center gap-8 shadow-[0_30px_70px_-45px_rgba(60,40,20,0.35)]">
        <div className="relative w-28 h-28 shrink-0 mx-auto md:mx-0">
          <svg width="112" height="112" viewBox="0 0 112 112" className="-rotate-90">
            <circle cx="56" cy="56" r={r} fill="none" stroke="#efe9df" strokeWidth="9" />
            <circle
              cx="56"
              cy="56"
              r={r}
              fill="none"
              stroke="url(#tkGrad)"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={c - (percentDone / 100) * c}
              style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1)" }}
            />
            <defs>
              <linearGradient id="tkGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#3f6e5b" />
                <stop offset="100%" stopColor="#86b99f" />
              </linearGradient>
            </defs>
          </svg>
          <span className="absolute inset-0 flex items-center justify-center tk-serif text-2xl">{percentDone}%</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#6b655e]">Task progress</p>
          <p className="tk-serif text-4xl md:text-5xl mt-2 leading-tight">
            {doneCount} <span className="text-[#c9c1b5]">of {tasks.length}</span> done
          </p>
          <div className="flex flex-wrap gap-2 mt-5">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`text-xs font-semibold px-4 py-2 rounded-full transition-all duration-300 ${
                  filter === f.value
                    ? "bg-[#1c1917] text-[#faf7f2]"
                    : "bg-[#f1ece4] text-[#6b655e] hover:text-[#1c1917]"
                }`}
              >
                {f.label} <span className="opacity-60 ml-1">{countOf(f.value)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {visible.length === 0 && (
        <div className="rounded-[24px] border border-dashed border-[#d9d1c4] bg-[#ffffff] p-8 text-center text-sm text-[#6b655e]">
          No tasks in this status.
        </div>
      )}

      {/* Task rows */}
      <ul className="space-y-3">
        {visible.map((t, i) => {
          const saving = savingIds.has(t._id);
          const pr = priorityMeta(t.priority);
          const isDone = t.status === "done";
          const confirming = confirmingId === t._id;
          return (
            <li
              key={t._id}
              className="tk-card group relative rounded-[24px] bg-[#ffffff] border border-[#e8e2d9] overflow-hidden hover:shadow-[0_20px_44px_-30px_rgba(60,40,20,0.35)] transition-shadow duration-300"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <span className="absolute left-0 top-0 bottom-0 w-1.5" style={{ background: pr.color }} />

              <div className="pl-7 pr-5 py-5 flex flex-col lg:flex-row lg:items-center gap-5">
                {/* Check */}
                <button
                  onClick={() => updateTask(t, { status: isDone ? "todo" : "done" })}
                  disabled={saving}
                  aria-label={isDone ? "Mark as to do" : "Mark as done"}
                  className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300 disabled:opacity-50 ${
                    isDone ? "bg-[#3f6e5b] border-[#3f6e5b]" : "border-[#d9d1c4] hover:border-[#3f6e5b]"
                  }`}
                >
                  {isDone && <Check className="w-4 h-4 text-[#faf7f2] tk-pop" strokeWidth={3} />}
                </button>

                {/* Title */}
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-base font-semibold leading-snug transition-colors ${
                      isDone ? "line-through text-[#a39c92]" : "text-[#1c1917]"
                    }`}
                  >
                    {t.title}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span
                      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                      style={{ background: pr.tint, color: pr.ink }}
                    >
                      <Flag className="w-3 h-3" /> {pr.label}
                    </span>
                    {t.assignee?.name && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#3f6e5b] bg-[#dcebe2] pl-1 pr-2.5 py-0.5 rounded-full">
                        <span className="w-4 h-4 rounded-full bg-[#ffffff] text-[9px] flex items-center justify-center">
                          {initialsOf(t.assignee.name)}
                        </span>
                        {t.assignee.name}
                      </span>
                    )}
                    {!t.assignee && t.assigneeGuess && (
                      <span className="text-[11px] text-[#6b655e]">Suggested: {t.assigneeGuess}</span>
                    )}
                    {t.createdBy === "user" && <span className="text-[11px] text-[#a39c92]">Added manually</span>}
                  </div>
                </div>

                {/* Controls */}
                <div className="flex flex-wrap items-center gap-4 shrink-0">
                  <div className="inline-flex p-1 rounded-full bg-[#f1ece4]">
                    {STATUS_OPTIONS.map((o) => (
                      <button
                        key={o.value}
                        disabled={saving}
                        onClick={() => t.status !== o.value && updateTask(t, { status: o.value })}
                        className={`text-[11px] font-semibold px-3 py-1.5 rounded-full transition-all duration-300 disabled:opacity-50 ${
                          t.status === o.value ? "bg-[#ffffff] text-[#1c1917] shadow-sm" : "text-[#6b655e] hover:text-[#1c1917]"
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>

                  <div className="inline-flex p-1 rounded-full bg-[#f1ece4]">
                    {PRIORITY_OPTIONS.map((o) => (
                      <button
                        key={o.value}
                        disabled={saving}
                        onClick={() => t.priority !== o.value && updateTask(t, { priority: o.value })}
                        aria-label={`Set urgency ${o.label}`}
                        className={`text-[11px] font-semibold px-3 py-1.5 rounded-full transition-all duration-300 disabled:opacity-50 ${
                          t.priority === o.value ? "bg-[#ffffff] text-[#1c1917] shadow-sm" : "text-[#6b655e] hover:text-[#1c1917]"
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setConfirmingId(confirming ? null : t._id)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      confirming ? "bg-[#f9e1d6] text-[#b4475a]" : "text-[#a39c92] hover:bg-[#f9e1d6] hover:text-[#b4475a]"
                    }`}
                    aria-label={`Delete task: ${t.title}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {confirming && (
                <div className="tk-fade mx-5 mb-5 ml-7 rounded-2xl bg-[#f9e1d6]/60 border border-[#f2c9b8] p-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="flex items-center gap-2 text-sm text-[#a4502d]">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    Delete "<span className="font-semibold">{t.title}</span>"? This can't be undone.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => deleteTask(t._id)}
                      className="text-xs font-semibold bg-[#b4475a] text-[#faf7f2] px-4 py-2 rounded-full hover:bg-[#8f3346] transition-colors"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setConfirmingId(null)}
                      className="text-xs font-semibold border border-[#e8e2d9] bg-[#ffffff] px-4 py-2 rounded-full hover:border-[#1c1917] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}