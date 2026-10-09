import React, { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import toast from "react-hot-toast";
import api from "../api/axios.js";
import { BarChart3, FileText, Folder, Activity } from "lucide-react";

export default function AnalyticsPanel({ projectId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/projects/${projectId}/analytics`)
      .then((res) => setData(res.data))
      .catch(() => toast.error("Failed to load analytics"))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading)
    return (
      <div className="card p-8 text-center text-slate-400">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs">Loading workspace analytics...</p>
      </div>
    );
  if (!data) return null;

  const chartData = data.contribution.map((c) => ({
    name: c.user.name.split(" ")[0],
    Notes: c.notes,
    Files: c.files,
  }));

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-5">
        <div className="card p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400 light:text-slate-500">
              Total Notes Created
            </p>
            <p className="text-3xl font-extrabold text-indigo-400 dark:text-indigo-300 light:text-indigo-600">{data.totals.notes}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        <div className="card p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400 light:text-slate-500">
              Total Files Uploaded
            </p>
            <p className="text-3xl font-extrabold text-indigo-400 dark:text-indigo-300 light:text-indigo-600">{data.totals.files}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Folder className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="card p-6 space-y-4">
        <h4 className="font-bold text-sm text-white dark:text-white light:text-slate-900 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-indigo-400" />
          <span>Team Contribution Breakdown</span>
        </h4>
        <div className="pt-2">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" fontSize={12} stroke="#94a3b8" />
              <YAxis allowDecimals={false} fontSize={12} stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderColor: "#1e293b",
                  borderRadius: "12px",
                  fontSize: "12px",
                  color: "#f8fafc",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
              <Bar dataKey="Notes" fill="#6366f1" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Files" fill="#38bdf8" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-6 space-y-4">
        <h4 className="font-bold text-sm text-white dark:text-white light:text-slate-900 flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-400" />
          <span>Recent Activity Trail</span>
        </h4>
        {data.recentActivity.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-500">No recent activity recorded.</p>
        ) : (
          <ul className="space-y-3 text-xs">
            {data.recentActivity.map((a, i) => (
              <li
                key={i}
                className="text-slate-300 dark:text-slate-300 light:text-slate-700 border-b border-slate-800/60 dark:border-slate-800/60 light:border-slate-200 pb-2.5 last:border-0 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <span className="font-semibold text-white dark:text-white light:text-slate-900 capitalize">
                    {a.action?.replace(/_/g, " ")}
                  </span>
                  {a.detail ? <span className="text-slate-400 dark:text-slate-400 light:text-slate-600"> — {a.detail}</span> : ""}
                </div>
                <span className="text-[11px] text-slate-500 flex-shrink-0">{new Date(a.createdAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}