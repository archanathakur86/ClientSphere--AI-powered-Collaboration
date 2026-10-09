import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../api/axios.js";
import { CheckSquare, Trash2, Filter, AlertCircle } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "todo", label: "To do" },
  { value: "in-progress", label: "In progress" },
  { value: "done", label: "Done" },
];

const PRIORITY_OPTIONS = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const STATUS_STYLES = {
  todo: "bg-slate-800/80 dark:bg-slate-800/80 light:bg-slate-200 text-slate-300 dark:text-slate-300 light:text-slate-700 border-slate-700/80 dark:border-slate-700/80 light:border-slate-300",
  "in-progress": "bg-sky-500/10 text-sky-400 dark:text-sky-300 light:text-sky-700 border-sky-500/30",
  done: "bg-emerald-500/10 text-emerald-400 dark:text-emerald-300 light:text-emerald-700 border-emerald-500/30",
};

const PRIORITY_STYLES = {
  high: "bg-rose-500/10 text-rose-400 dark:text-rose-300 light:text-rose-700 border-rose-500/30",
  medium: "bg-amber-500/10 text-amber-400 dark:text-amber-300 light:text-amber-700 border-amber-500/30",
  low: "bg-slate-800/80 dark:bg-slate-800/80 light:bg-slate-200 text-slate-400 dark:text-slate-400 light:text-slate-600 border-slate-700/80 dark:border-slate-700/80 light:border-slate-300",
};

const FILTERS = [{ value: "all", label: "All" }, ...STATUS_OPTIONS];

const selectClass = (styles) =>
  `text-xs font-semibold rounded-xl border px-3 py-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-60 disabled:cursor-wait transition-colors ${styles}`;

export default function TaskList({ projectId }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [savingIds, setSavingIds] = useState(() => new Set());

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
  // The row's dropdowns are disabled while a save is in flight, so edits can't overlap.
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
    }
  };

  if (loading)
    return (
      <div className="card p-8 text-center text-slate-400">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs">Loading workspace tasks...</p>
      </div>
    );

  if (tasks.length === 0)
    return (
      <div className="card p-10 text-center text-slate-400 space-y-3">
        <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto">
          <CheckSquare className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-white dark:text-white light:text-slate-900">No tasks yet</p>
        <p className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-500 max-w-sm mx-auto">
          Use "Extract Tasks" on any note to auto-generate action items, or add project milestones.
        </p>
      </div>
    );

  const countOf = (value) => (value === "all" ? tasks.length : tasks.filter((t) => t.status === value).length);
  const doneCount = countOf("done");
  const percentDone = Math.round((doneCount / tasks.length) * 100);
  const visible = filter === "all" ? tasks : tasks.filter((t) => t.status === filter);

  return (
    <div className="space-y-4">
      {/* Progress Card */}
      <div className="card p-5 space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-slate-200 dark:text-slate-200 light:text-slate-800">
            {doneCount} of {tasks.length} tasks completed
          </span>
          <span className="text-indigo-400 font-bold">{percentDone}%</span>
        </div>
        <div className="h-2 bg-slate-800 dark:bg-slate-800 light:bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-500 rounded-full"
            style={{ width: `${percentDone}%` }}
          />
        </div>
      </div>

      {/* Status Filter Chips */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs font-semibold text-slate-400 dark:text-slate-400 light:text-slate-600 flex items-center gap-1 mr-1">
          <Filter className="w-3.5 h-3.5" /> Filter:
        </span>
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`text-xs px-3 py-1.5 rounded-xl font-semibold border transition-all ${
              filter === f.value
                ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20"
                : "bg-slate-900/80 dark:bg-slate-900/80 light:bg-white text-slate-400 dark:text-slate-400 light:text-slate-700 border-slate-800 dark:border-slate-800 light:border-slate-200 hover:bg-slate-800"
            }`}
          >
            {f.label} ({countOf(f.value)})
          </button>
        ))}
      </div>

      {visible.length === 0 && (
        <div className="card p-8 text-center text-slate-400 text-xs">No tasks found matching this status filter.</div>
      )}

      {/* Tasks List Container */}
      <div className="space-y-2.5">
        {visible.map((t) => {
          const saving = savingIds.has(t._id);
          return (
            <div
              key={t._id}
              className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-700/80 transition-all"
            >
              <div className="min-w-0 space-y-1">
                <p
                  className={`text-sm font-semibold leading-snug ${
                    t.status === "done"
                      ? "line-through text-slate-500 dark:text-slate-500 light:text-slate-400"
                      : "text-white dark:text-white light:text-slate-900"
                  }`}
                >
                  {t.title}
                </p>
                {t.assigneeGuess && (
                  <p className="text-xs text-indigo-400 dark:text-indigo-400 light:text-indigo-600 font-medium">
                    Suggested assignee: {t.assigneeGuess}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 flex-shrink-0 flex-wrap sm:flex-nowrap">
                <label className="flex flex-col gap-1 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Status
                  <select
                    value={t.status}
                    disabled={saving}
                    onChange={(e) => updateTask(t, { status: e.target.value })}
                    className={selectClass(STATUS_STYLES[t.status])}
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Urgency
                  <select
                    value={t.priority}
                    disabled={saving}
                    onChange={(e) => updateTask(t, { priority: e.target.value })}
                    className={selectClass(PRIORITY_STYLES[t.priority])}
                  >
                    {PRIORITY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  onClick={() => deleteTask(t._id)}
                  className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors self-end sm:self-center"
                  aria-label={`Delete task: ${t.title}`}
                  title="Delete Task"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}