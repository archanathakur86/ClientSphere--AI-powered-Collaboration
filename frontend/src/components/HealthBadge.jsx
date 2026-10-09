import React, { useEffect, useState, useCallback } from "react";
import api from "../api/axios.js";
import { Activity, RefreshCw } from "lucide-react";

const STATUS_STYLES = {
  healthy: "bg-emerald-500/10 text-emerald-400 dark:text-emerald-300 light:text-emerald-700 border-emerald-500/30 shadow-sm shadow-emerald-500/10",
  slowing: "bg-amber-500/10 text-amber-400 dark:text-amber-300 light:text-amber-700 border-amber-500/30 shadow-sm shadow-amber-500/10",
  inactive: "bg-rose-500/10 text-rose-400 dark:text-rose-300 light:text-rose-700 border-rose-500/30 shadow-sm shadow-rose-500/10",
};

const STATUS_DOT = {
  healthy: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]",
  slowing: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]",
  inactive: "bg-rose-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]",
};

// refreshKey: bump this number from the parent whenever a note/file/task is
// created or deleted so the badge updates immediately, without needing a
// full page reload. The server caches the health result, so no polling needed.
export default function HealthBadge({ projectId, refreshKey }) {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await api.get(`/projects/${projectId}/ai/health`);
      setHealth(res.data);
      setErrored(false);
    } catch (err) {
      setErrored(true);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    setLoading(true);
    fetchHealth();
  }, [fetchHealth, refreshKey]);

  if (loading && !health) {
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs bg-slate-900/80 text-slate-400 border-slate-800 animate-pulse">
        <span className="w-2 h-2 rounded-full bg-indigo-400" />
        <span>Analyzing project health...</span>
      </span>
    );
  }

  if (errored || !health) {
    return (
      <button
        onClick={fetchHealth}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white transition-colors"
      >
        <Activity className="w-3.5 h-3.5 text-amber-400" />
        <span>Health check offline</span>
      </button>
    );
  }

  const status = health.insight?.status || "healthy";

  return (
    <button
      onClick={fetchHealth}
      title="Click to refresh AI health diagnostic"
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold tracking-wide transition-all hover:scale-105 ${STATUS_STYLES[status]}`}
    >
      <span className={`w-2 h-2 rounded-full ${STATUS_DOT[status]}`} />
      <span className="capitalize">{status}</span>
      <span className="text-[11px] opacity-80 hidden md:inline truncate max-w-xs">— {health.insight?.reason}</span>
      {loading && <RefreshCw className="w-3 h-3 animate-spin opacity-70" />}
    </button>
  );
}