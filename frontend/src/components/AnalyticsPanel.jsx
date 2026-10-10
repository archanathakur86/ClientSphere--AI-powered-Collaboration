import React, { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";
import toast from "react-hot-toast";
import api from "../api/axios.js";
import { StickyNote, FileText, Trophy, Users, Activity } from "lucide-react";

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,400;1,9..144,500&display=swap');

.an-serif { font-family: 'Fraunces', Georgia, serif; font-weight: 500; letter-spacing: -0.025em; }

@keyframes anIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes anBar { from { transform: scaleX(0); } to { transform: scaleX(var(--p, 0)); } }
.an-in { animation: anIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
.an-card { animation: anIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) backwards; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
`;

const MEMBER_TINTS = [
  { bg: "#f6dccb", ink: "#a4502d", bar: "#c4673f" },
  { bg: "#dcebe2", ink: "#3f6e5b", bar: "#3f6e5b" },
  { bg: "#f7ecc9", ink: "#8a6418", bar: "#e0a46f" },
  { bg: "#efe6f0", ink: "#6e4a78", bar: "#8b6a96" },
  { bg: "#e4eef7", ink: "#3d6584", bar: "#4f7ca0" },
];

// Colour of the dot for each kind of activity, so the timeline is easy to scan.
const activityDot = (action = "") => {
  if (action.includes("file")) return "#3f6e5b";
  if (action.includes("note")) return "#c4673f";
  if (action.includes("milestone") || action.includes("invoice")) return "#e0a46f";
  if (action.includes("task")) return "#8b6a96";
  return "#a39c92";
};

const tooltipStyle = {
  borderRadius: 16,
  border: "1px solid #e8e2d9",
  background: "#ffffff",
  boxShadow: "0 20px 40px -24px rgba(60,40,20,0.35)",
  fontSize: 12,
};

const initialsOf = (name = "") => name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";

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

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <style>{STYLES}</style>
        <div className="grid sm:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 rounded-[28px] bg-[#f1ece4] animate-pulse" />
          ))}
        </div>
        <div className="h-96 rounded-[32px] bg-[#f1ece4] animate-pulse" />
      </div>
    );
  }
  if (!data) return null;

  const contributions = data.contribution || [];
  const chartData = contributions.map((c) => ({
    name: (c.user?.name || "Member").split(" ")[0],
    Notes: c.notes,
    Files: c.files,
  }));

  const totalWork = contributions.reduce((s, c) => s + (c.notes || 0) + (c.files || 0), 0);
  const ranked = [...contributions]
    .map((c) => ({ ...c, work: (c.notes || 0) + (c.files || 0) }))
    .sort((a, b) => b.work - a.work);
  const top = ranked[0];

  return (
    <div className="space-y-8">
      <style>{STYLES}</style>

      <div className="an-in">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[#c4673f]">Project pulse</p>
        <h3 className="an-serif text-5xl md:text-6xl mt-3 leading-[1.02]">Who's shaping this project</h3>
      </div>

      {/* Stat cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="an-card rounded-[28px] bg-[#ffffff] border border-[#e8e2d9] p-6">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#6b655e]">Notes</p>
            <span className="w-9 h-9 rounded-xl bg-[#f6dccb] flex items-center justify-center">
              <StickyNote className="w-4 h-4 text-[#a4502d]" />
            </span>
          </div>
          <p className="an-serif text-6xl mt-5 leading-none tabular-nums">{data.totals?.notes ?? 0}</p>
        </div>
        <div className="an-card rounded-[28px] bg-[#ffffff] border border-[#e8e2d9] p-6" style={{ animationDelay: "80ms" }}>
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#6b655e]">Files</p>
            <span className="w-9 h-9 rounded-xl bg-[#dcebe2] flex items-center justify-center">
              <FileText className="w-4 h-4 text-[#3f6e5b]" />
            </span>
          </div>
          <p className="an-serif text-6xl mt-5 leading-none tabular-nums">{data.totals?.files ?? 0}</p>
        </div>
        <div className="an-card rounded-[28px] bg-[#1c1917] text-[#faf7f2] p-6 relative overflow-hidden" style={{ animationDelay: "160ms" }}>
          <div
            className="absolute -top-16 -right-16 w-48 h-48 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, #c4673f55 0%, transparent 70%)" }}
          />
          <div className="relative flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#d9d2c7]">Top contributor</p>
            <Trophy className="w-4 h-4 text-[#f6dccb]" />
          </div>
          <p className="relative an-serif text-3xl mt-5 leading-tight truncate">{top?.user?.name || "No one yet"}</p>
          <p className="relative text-xs text-[#d9d2c7] mt-2">
            {top && totalWork > 0 ? `${Math.round((top.work / totalWork) * 100)}% of all contributions` : "Add notes or files to see this"}
          </p>
        </div>
      </div>

      {/* Contribution */}
      <div className="an-card grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 rounded-[32px] bg-[#ffffff] border border-[#e8e2d9] p-7 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#6b655e]">Contribution</p>
              <p className="an-serif text-2xl mt-1">Notes and files by member</p>
            </div>
          </div>
          {chartData.length === 0 ? (
            <p className="text-sm text-[#6b655e] py-16 text-center">No contributions yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} barGap={6}>
                <CartesianGrid vertical={false} stroke="#efe9df" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#6b655e", fontSize: 12 }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#6b655e", fontSize: 12 }} />
                <Tooltip cursor={{ fill: "#faf7f2" }} contentStyle={tooltipStyle} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: "#6b655e" }} />
                <Bar dataKey="Notes" fill="#c4673f" radius={[8, 8, 0, 0]} />
                <Bar dataKey="Files" fill="#86b99f" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Member shares */}
        <div className="lg:col-span-5 rounded-[32px] bg-[#ffffff] border border-[#e8e2d9] p-7 md:p-8">
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-4 h-4 text-[#6b655e]" />
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#6b655e]">Share of work</p>
          </div>
          {ranked.length === 0 ? (
            <p className="text-sm text-[#6b655e]">No members have contributed yet.</p>
          ) : (
            <ul className="space-y-5">
              {ranked.map((c, i) => {
                const tint = MEMBER_TINTS[i % MEMBER_TINTS.length];
                const share = totalWork ? Math.round((c.work / totalWork) * 100) : 0;
                return (
                  <li key={c.user?._id || i}>
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-9 h-9 rounded-full flex items-center justify-center an-serif text-sm shrink-0" style={{ background: tint.bg, color: tint.ink }}>
                          {initialsOf(c.user?.name)}
                        </span>
                        <span className="text-sm font-semibold truncate">{c.user?.name || "Member"}</span>
                      </div>
                      <span className="text-sm font-semibold tabular-nums">{share}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#efe9df] overflow-hidden">
                      <div
                        className="h-full rounded-full origin-left"
                        style={{
                          width: "100%",
                          background: tint.bar,
                          "--p": share / 100,
                          animation: `anBar 1.1s cubic-bezier(0.16,1,0.3,1) ${i * 120}ms both`,
                        }}
                      />
                    </div>
                    <p className="text-[11px] text-[#a39c92] mt-1.5">
                      {c.notes || 0} notes · {c.files || 0} files
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Recent activity */}
      <div className="an-card rounded-[32px] bg-[#ffffff] border border-[#e8e2d9] p-7 md:p-8">
        <div className="flex items-center gap-2 mb-7">
          <Activity className="w-4 h-4 text-[#6b655e]" />
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#6b655e]">Recent activity</p>
        </div>
        {(data.recentActivity || []).length === 0 ? (
          <p className="text-sm text-[#6b655e]">Nothing has happened yet.</p>
        ) : (
          <ol className="relative ml-2">
            <span className="absolute left-[5px] top-2 bottom-2 w-px bg-[#e8e2d9]" />
            {data.recentActivity.map((a, i) => (
              <li key={i} className="an-card relative pl-8 pb-6 last:pb-0" style={{ animationDelay: `${i * 50}ms` }}>
                <span className="absolute left-0 top-1.5 w-3 h-3 rounded-full border-2 border-[#ffffff]" style={{ background: activityDot(a.action) }} />
                <p className="text-sm">
                  <span className="font-semibold capitalize">{a.action?.replace(/_/g, " ")}</span>
                  {a.detail && <span className="text-[#6b655e]"> · {a.detail}</span>}
                </p>
                <p className="text-[11px] text-[#a39c92] mt-1">{new Date(a.createdAt).toLocaleString()}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}