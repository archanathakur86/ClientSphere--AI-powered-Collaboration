import React, { useEffect, useState, useCallback } from "react";
import api from "../api/axios.js";

const STATUS_STYLES = {
  healthy: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  slowing: "bg-yellow-500/10 text-yellow-300 border-yellow-500/30",
  inactive: "bg-red-500/10 text-red-300 border-red-500/30",
};

const STATUS_EMOJI = { healthy: "🟢", slowing: "🟡", inactive: "🔴" };

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
      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm bg-slate-950 text-slate-400 border-slate-800">
        <span className="w-2 h-2 rounded-full bg-slate-300 animate-pulse" /> Checking health...
      </span>
    );
  }

  if (errored || !health) {
    return (
      <button
        onClick={fetchHealth}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"
      >
        ⚠️ Health unavailable — retry
      </button>
    );
  }

  const status = health.insight?.status || "healthy";

  return (
    <button
      onClick={fetchHealth}
      title="Click to refresh"
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition-opacity hover:opacity-80 ${STATUS_STYLES[status]}`}
    >
      <span>{STATUS_EMOJI[status]}</span>
      <span className="font-medium capitalize">{status}</span>
      <span className="text-xs opacity-80 hidden sm:inline">— {health.insight?.reason}</span>
      {loading && <span className="text-xs opacity-60">↻</span>}
    </button>
  );
}