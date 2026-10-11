import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/axios.js";
import HealthBadge from "../components/HealthBadge.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useRealtime } from "../hooks/useRealtime.js";
import NotificationBell, { notificationDestination } from "../components/NotificationBell.jsx";
import {
  Sparkles,
  Plus,
  Clock,
  AlertTriangle,
  FolderKanban,
  ArrowRight,
  Search,
  X,
  DollarSign,
  Layers,
  CalendarClock,
  LogOut,
} from "lucide-react";

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,400;1,9..144,500&display=swap');

.ds-serif { font-family: 'Fraunces', Georgia, serif; font-weight: 500; letter-spacing: -0.025em; }

@keyframes dsIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes dsSlide { from { transform: translateX(100%); } to { transform: translateX(0); } }
@keyframes dsFade { from { opacity: 0; } to { opacity: 1; } }
@keyframes dsSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.ds-in { animation: dsIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) both; }
.ds-card { animation: dsIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) backwards; }
.ds-slide { animation: dsSlide 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
.ds-backdrop { animation: dsFade 0.3s ease both; }
.ds-spin { animation: dsSpin 48s linear infinite; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
`;

const TINTS = ["#f6dccb", "#dcebe2", "#f7ecc9", "#efe6f0", "#e4eef7"];
const INK_TINTS = ["#a4502d", "#3f6e5b", "#8a6418", "#6e4a78", "#3d6584"];

const DAY = 86400000;
const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const daysUntil = (due) => Math.round((startOfDay(due) - startOfDay(new Date())) / DAY);

// "in 3 days" / "2 days overdue" for deadline lines.
const describeDeadline = (dueDate) => {
  const days = daysUntil(dueDate);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return days > 1 ? `in ${days} days` : `${Math.abs(days)} day${days === -1 ? "" : "s"} overdue`;
};

const timeAgo = (date) => {
  const s = (Date.now() - new Date(date).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const greetingWord = () => {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
};

function useCountUp(target, duration = 1000) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function StatNumber({ value, loading }) {
  const n = useCountUp(Number(value) || 0);
  return <span>{loading ? "–" : n}</span>;
}

function ProgressRing({ percent }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setShown(percent), 200);
    return () => clearTimeout(t);
  }, [percent]);

  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative w-14 h-14 shrink-0">
      <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="#e8e2d9" strokeWidth="5" />
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          stroke="#c4673f"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (shown / 100) * c}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-[#1c1917]">
        {percent}%
      </span>
    </div>
  );
}

function ProjectCard({ p, i, featured }) {
  const clientName = p.clientName || "";
  const sm = p.summary || {};
  const total = sm.milestonesTotal || 0;
  const percent = total ? Math.round((sm.milestonesApproved / total) * 100) : 0;
  const late = sm.nextDeadline ? new Date(sm.nextDeadline.dueDate) < new Date() : false;
  const tint = TINTS[i % TINTS.length];
  const ink = INK_TINTS[i % INK_TINTS.length];
  const monogram = (clientName || p.name).charAt(0).toUpperCase();
  const hasAlerts = sm.pendingApprovals > 0 || sm.changesRequested > 0 || sm.overdueInvoices > 0 || sm.scopeAlerts > 0;

  // Spotlight: a soft glow follows the pointer across the card.
  const handleMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--x", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--y", `${e.clientY - r.top}px`);
  };

  return (
    <article
      onMouseMove={handleMove}
      className={`ds-card group relative flex flex-col rounded-[26px] bg-[#ffffff] border border-[#e8e2d9] overflow-hidden hover:-translate-y-1 hover:shadow-[0_28px_60px_-30px_rgba(60,40,20,0.35)] transition-all duration-500 ${
        featured ? "md:col-span-2" : ""
      }`}
      style={{ animationDelay: `${i * 90}ms` }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(360px circle at var(--x, 50%) var(--y, 0%), ${tint}, transparent 70%)`,
        }}
      />

      <div className="relative p-6 flex-1">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="w-11 h-11 rounded-full flex items-center justify-center ds-serif text-lg shrink-0"
              style={{ background: tint, color: ink }}
            >
              {monogram}
            </span>
            <p className="text-xs text-[#6b655e] truncate">{clientName || "No client yet"}</p>
          </div>
          <span className="shrink-0 text-[10px] uppercase tracking-[0.2em] text-[#a39c92]">
            {String(i + 1).padStart(2, "0")}
          </span>
        </div>

        <h3 className="ds-serif text-3xl mt-6 leading-tight group-hover:text-[#c4673f] transition-colors duration-300">
          {p.name}
        </h3>
        <p className="mt-3 text-sm text-[#6b655e] leading-relaxed line-clamp-2">
          {p.description || "No detailed scope added yet."}
        </p>

        <div className="mt-4">
          <HealthBadge projectId={p._id} />
        </div>

        {hasAlerts && (
          <div className="flex flex-wrap gap-2 mt-4">
            {sm.pendingApprovals > 0 && (
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#f7ecc9] text-[#8a6418]">
                {sm.pendingApprovals} awaiting client
              </span>
            )}
            {sm.changesRequested > 0 && (
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#f9e1d6] text-[#a4502d]">
                {sm.changesRequested} changes requested
              </span>
            )}
            {sm.overdueInvoices > 0 && (
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#f9e1d6] text-[#a4502d]">
                {sm.overdueInvoices} overdue invoice{sm.overdueInvoices > 1 ? "s" : ""}
              </span>
            )}
            {sm.scopeAlerts > 0 && (
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#e4eef7] text-[#3d6584]">
                {sm.scopeAlerts} scope alert{sm.scopeAlerts > 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}

        {total > 0 && (
          <div className="flex items-center gap-4 mt-6">
            <ProgressRing percent={percent} />
            <p className="text-xs text-[#6b655e] leading-snug">
              <span className="block text-sm font-semibold text-[#1c1917]">
                {sm.milestonesApproved} of {total}
              </span>
              milestones approved
            </p>
          </div>
        )}
      </div>

      <div className="relative px-6 py-4 border-t border-[#e8e2d9] flex items-center justify-between gap-3">
        <div className={`text-xs flex items-center gap-1.5 min-w-0 ${late ? "text-[#b4475a] font-semibold" : "text-[#6b655e]"}`}>
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">
            {sm.nextDeadline
              ? `${sm.nextDeadline.title}: ${describeDeadline(sm.nextDeadline.dueDate)}`
              : sm.overdueMilestones > 0
              ? `${sm.overdueMilestones} milestone${sm.overdueMilestones > 1 ? "s" : ""} overdue`
              : total > 0
              ? "No upcoming deadlines"
              : "No milestones yet"}
          </span>
        </div>
        <Link
          to={`/projects/${p._id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#1c1917] text-[#faf7f2] px-4 py-2 rounded-full hover:bg-[#c4673f] transition-colors shrink-0"
        >
          Open
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </article>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
    const { user, logout } = useAuth();
  const [projects, setProjects] = useState([]);
  const [summary, setSummary] = useState({ activeProjects: 0, pendingApprovals: 0, overdueInvoices: 0, scopeAlerts: 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const realtime = useRealtime({ enabled: !!user });

  const [form, setForm] = useState({
    name: "",
    clientName: "",
    clientEmail: "",
    description: "",
  });

  // `silent` refreshes in the background (used for live updates) without the loading skeleton.
  const loadProjects = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get("/projects");
      setProjects(res.data.projects || []);
      if (res.data.summary) setSummary(res.data.summary);
    } catch (err) {
      if (!silent) toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  // Live: a client approving, commenting or paying updates the numbers without a refresh.
  useEffect(() => {
    const socket = realtime.socket;
    if (!socket) return undefined;
    const refresh = () => loadProjects({ silent: true });
    socket.on("notification:new", refresh);
    return () => socket.off("notification:new", refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realtime.socket]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Project name is required");
    setCreating(true);

    try {
      const res = await api.post("/projects", {
        name: form.name.trim(),
        description: form.description.trim(),
        clientName: form.clientName.trim(),
        clientEmail: form.clientEmail.trim(),
      });
      toast.success("Project created!");
      setForm({ name: "", clientName: "", clientEmail: "", description: "" });
      setShowForm(false);
      if (res.data.project?._id) {
        navigate(`/projects/${res.data.project._id}`);
      } else {
        loadProjects();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  // A realistic demo project (client, three milestones with dates and prices) so a new
  // account has something real to click through.
  const handleSeedSampleProject = async () => {
    setCreating(true);
    try {
      const res = await api.post("/projects", {
        name: "Nexus SaaS Brand & Web Redesign",
        description: "Brand identity, Figma wireframes and a React web app integration.",
        clientName: "Acme Global Corp",
        clientEmail: "contact@acme.com",
      });
      const id = res.data.project._id;
      const inDays = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const sample = [
        { title: "Brand identity", description: "Logo, colour palette and typography.", amount: 1200, dueDate: inDays(7) },
        { title: "Website wireframes", description: "Figma wireframes for the five main pages.", amount: 1800, dueDate: inDays(18) },
        { title: "Web app build", description: "React frontend connected to the API.", amount: 3500, dueDate: inDays(40) },
      ];
      for (const milestone of sample) {
        await api.post(`/projects/${id}/milestones`, milestone);
      }
      toast.success("Sample project added");
      navigate(`/projects/${id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not add the sample project");
    } finally {
      setCreating(false);
    }
  };

  const filteredProjects = projects.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.clientName && p.clientName.toLowerCase().includes(q)) ||
      (p.description && p.description.toLowerCase().includes(q))
    );
  });

  // Upcoming deadlines, soonest first, built from each project's next milestone.
  const upcoming = projects
    .filter((p) => p.summary?.nextDeadline?.dueDate)
    .map((p) => ({
      id: p._id,
      name: p.name,
      title: p.summary.nextDeadline.title,
      due: p.summary.nextDeadline.dueDate,
    }))
    .sort((a, b) => new Date(a.due) - new Date(b.due))
    .slice(0, 5);

  const feed = (realtime.notifications || []).slice(0, 6);

  // One-line daily brief built from the same real summary numbers.
  const briefParts = [];
  if (summary.pendingApprovals > 0)
    briefParts.push(`${summary.pendingApprovals} milestone${summary.pendingApprovals > 1 ? "s" : ""} waiting on client approval`);
  if (summary.overdueInvoices > 0)
    briefParts.push(`${summary.overdueInvoices} overdue invoice${summary.overdueInvoices > 1 ? "s" : ""}`);
  if (summary.scopeAlerts > 0)
    briefParts.push(`${summary.scopeAlerts} scope alert${summary.scopeAlerts > 1 ? "s" : ""} to review`);
  const brief = briefParts.length ? `${briefParts.join(", ")}.` : "Everything is on track today.";

  const firstName = (user?.name || "there").split(" ")[0];
  const todayLabel = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  const stats = [
    { label: "Active projects", value: summary.activeProjects ?? projects.length, dot: "#86b99f" },
    { label: "Awaiting approval", value: summary.pendingApprovals || 0, dot: "#e0a46f" },
    { label: "Overdue invoices", value: summary.overdueInvoices || 0, dot: "#e28595" },
    { label: "Scope alerts", value: summary.scopeAlerts || 0, dot: "#f6dccb" },
  ];

  return (
    <div className="min-h-screen bg-[#faf7f2] text-[#1c1917] font-sans pb-24 selection:bg-[#f6dccb]">
      <style>{STYLES}</style>

      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-[#faf7f2]/85 backdrop-blur-xl border-b border-[#e8e2d9]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-4">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#1c1917] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#f6dccb]" />
            </span>
            <span className="font-semibold tracking-tight">ClientSphere</span>
          </Link>
          

            <div className="flex items-center gap-3">
              <NotificationBell
              notifications={realtime.notifications}
              unreadCount={realtime.unreadCount}
              onMarkRead={realtime.markNotificationRead}
              onMarkAllRead={realtime.markAllRead}
            />
            <div className="hidden sm:flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-full bg-[#ffffff] border border-[#e8e2d9]">
              <span className="w-7 h-7 rounded-full bg-[#f6dccb] text-[#a4502d] ds-serif text-sm flex items-center justify-center">
                {(user?.name || "U").charAt(0).toUpperCase()}
              </span>
              <span className="text-xs font-semibold max-w-[8rem] truncate">{user?.name || "Account"}</span>
            </div>

            
            <button
              onClick={() => {
                logout();
                navigate("/");
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6b655e] hover:text-[#b4475a] px-3 py-2 rounded-full hover:bg-[#f9e1d6] transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Sign out</span>
            </button>
    
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 sm:px-8 pt-12 space-y-14">
        {/* Hero: greeting + animated pulse */}
        <section className="grid lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-center ds-in">
            <p className="text-xs uppercase tracking-[0.22em] text-[#6b655e]">{todayLabel}</p>
            <h1 className="ds-serif text-5xl md:text-7xl mt-4 leading-[1.0]">
              Good {greetingWord()},{" "}
              <em className="italic text-[#c4673f]">{firstName}.</em>
            </h1>
            <p className="mt-6 text-lg text-[#6b655e] max-w-xl leading-relaxed">
              {loading ? "Loading your workspace…" : brief}
            </p>
          </div>

          <div className="lg:col-span-5 ds-card relative rounded-[32px] bg-[#1c1917] text-[#faf7f2] p-8 overflow-hidden">
            <svg
              className="ds-spin pointer-events-none absolute -right-24 -top-24 w-80 h-80 opacity-[0.12]"
              viewBox="0 0 200 200"
              aria-hidden="true"
            >
              <circle cx="100" cy="100" r="95" fill="none" stroke="#f6dccb" strokeWidth="0.6" strokeDasharray="2 6" />
              <circle cx="100" cy="100" r="70" fill="none" stroke="#f6dccb" strokeWidth="0.6" />
            </svg>
            <div
              className="absolute -bottom-24 -left-16 w-64 h-64 rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle, #c4673f44 0%, transparent 70%)" }}
            />
            <p className="relative text-xs uppercase tracking-[0.22em] text-[#d9d2c7]">Workspace pulse</p>
            <div className="relative mt-6 grid grid-cols-2 gap-x-6 gap-y-8">
              {stats.map((s) => (
                <div key={s.label}>
                  <div className="flex items-center gap-2 text-xs text-[#d9d2c7]">
                    <span className="w-2 h-2 rounded-full" style={{ background: s.dot }} />
                    {s.label}
                  </div>
                  <div className="ds-serif text-6xl mt-2 tabular-nums">
                    <StatNumber value={s.value} loading={loading} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* New project drawer */}
        {showForm && (
          <div className="fixed inset-0 z-50">
            <div className="ds-backdrop absolute inset-0 bg-[#1c1917]/30" onClick={() => setShowForm(false)} />
            <aside className="ds-slide absolute right-0 top-0 h-full w-full max-w-md bg-[#faf7f2] shadow-2xl overflow-y-auto">
              <form onSubmit={handleCreate} className="p-8 space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-[#c4673f]">New workspace</p>
                    <h3 className="ds-serif text-4xl mt-3 leading-tight">Start a project</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="w-9 h-9 rounded-full border border-[#e8e2d9] flex items-center justify-center hover:border-[#1c1917] transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#6b655e] mb-2">
                      Project title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. E-Commerce Redesign"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full px-4 py-3 bg-[#ffffff] border border-[#e8e2d9] rounded-2xl text-sm placeholder-[#a39c92] focus:outline-none focus:border-[#c4673f] focus:ring-2 focus:ring-[#f6dccb]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#6b655e] mb-2">
                      Client name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Acme Corp"
                      value={form.clientName}
                      onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                      className="w-full px-4 py-3 bg-[#ffffff] border border-[#e8e2d9] rounded-2xl text-sm placeholder-[#a39c92] focus:outline-none focus:border-[#c4673f] focus:ring-2 focus:ring-[#f6dccb]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#6b655e] mb-2">
                      Client email
                    </label>
                    <input
                      type="email"
                      placeholder="client@acme.com (you can invite them later)"
                      value={form.clientEmail}
                      onChange={(e) => setForm({ ...form, clientEmail: e.target.value })}
                      className="w-full px-4 py-3 bg-[#ffffff] border border-[#e8e2d9] rounded-2xl text-sm placeholder-[#a39c92] focus:outline-none focus:border-[#c4673f] focus:ring-2 focus:ring-[#f6dccb]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#6b655e] mb-2">
                      Scope and description
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Briefly describe the key deliverables and milestones..."
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      className="w-full px-4 py-3 bg-[#ffffff] border border-[#e8e2d9] rounded-2xl text-sm placeholder-[#a39c92] focus:outline-none focus:border-[#c4673f] focus:ring-2 focus:ring-[#f6dccb] resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 py-3 rounded-full border border-[#e8e2d9] text-sm font-semibold hover:border-[#1c1917] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 py-3 rounded-full bg-[#1c1917] text-[#faf7f2] text-sm font-semibold hover:bg-[#c4673f] transition-colors disabled:opacity-50"
                  >
                    {creating ? "Creating..." : "Save project"}
                  </button>
                </div>
              </form>
            </aside>
          </div>
        )}

        {/* Body: portfolio + sidebar */}
        <section className="grid lg:grid-cols-12 gap-10 items-start">
          {/* Portfolio */}
          <div className="lg:col-span-8">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-8">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[#6b655e]">Portfolio</p>
                <h2 className="ds-serif text-4xl mt-2">Your projects</h2>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-[#ffffff] border border-[#e8e2d9] rounded-full w-full md:w-64 focus-within:border-[#c4673f] transition-colors">
                  <Search className="w-4 h-4 text-[#6b655e]" />
                  <input
                    type="text"
                    placeholder="Search by name or client"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent focus:outline-none w-full text-sm placeholder-[#a39c92]"
                  />
                </div>
                  <button
                  onClick={() => setShowForm(true)}
                  className="group inline-flex items-center gap-2 text-sm font-semibold bg-[#f6dccb] text-[#1c1917] pl-3 pr-4 py-2.5 rounded-full hover:bg-[#c4673f] hover:text-[#faf7f2] transition-colors duration-300 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4 transition-transform duration-300 group-hover:rotate-90" />
                  New project
                </button>
                <span className="hidden sm:inline-flex text-xs font-semibold bg-[#f1ece4] px-3 py-2 rounded-full whitespace-nowrap">
                  {filteredProjects.length} active
                </span>
              </div>
            </div>

            {loading ? (
              <div className="grid md:grid-cols-2 gap-6" aria-busy="true" aria-label="Loading projects">
                {[0, 1].map((i) => (
                  <div key={i} className="rounded-[26px] bg-[#f1ece4] h-80 animate-pulse" />
                ))}
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="rounded-[28px] border-2 border-dashed border-[#d9d1c4] bg-[#ffffff] p-12 text-center">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-[#f6dccb] flex items-center justify-center">
                  <FolderKanban className="w-7 h-7 text-[#a4502d]" />
                </div>
                <h3 className="ds-serif text-3xl mt-6">No projects yet</h3>
                <p className="mt-3 text-sm text-[#6b655e] max-w-md mx-auto leading-relaxed">
                  Start with your first client project, or explore a sample with milestones and prices already set up.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    onClick={() => setShowForm(true)}
                    className="px-6 py-3 rounded-full bg-[#1c1917] text-[#faf7f2] text-sm font-semibold hover:bg-[#c4673f] transition-colors"
                  >
                    Create custom project
                  </button>
                  <button
                    onClick={handleSeedSampleProject}
                    disabled={creating}
                    className="px-6 py-3 rounded-full border border-[#e8e2d9] text-sm font-semibold hover:border-[#1c1917] transition-colors disabled:opacity-50"
                  >
                    Add sample template
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {filteredProjects.map((p, i) => (
                  <ProjectCard key={p._id} p={p} i={i} featured={i === 0 && filteredProjects.length > 2} />
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-28">
            {/* Up next timeline */}
            <div className="ds-card rounded-[26px] bg-[#ffffff] border border-[#e8e2d9] p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-[#c4673f]" />
                  <p className="ds-serif text-2xl">Up next</p>
                </div>
                <span className="text-xs text-[#6b655e]">{upcoming.length} scheduled</span>
              </div>

              {upcoming.length === 0 ? (
                <p className="mt-5 text-sm text-[#6b655e]">No deadlines on the calendar yet.</p>
              ) : (
                <ol className="mt-6">
                  {upcoming.map((u, idx) => {
                    const d = daysUntil(u.due);
                    const pill =
                      d < 0
                        ? "bg-[#f9e1d6] text-[#a4502d]"
                        : d <= 1
                        ? "bg-[#f7ecc9] text-[#8a6418]"
                        : "bg-[#dcebe2] text-[#3f6e5b]";
                    return (
                      <li
                        key={u.id + u.due}
                        className="ds-card relative pl-8 pb-6 last:pb-0"
                        style={{ animationDelay: `${idx * 110}ms` }}
                      >
                        {idx < upcoming.length - 1 && (
                          <span className="absolute left-[5px] top-4 bottom-0 w-px bg-[#e8e2d9]" />
                        )}
                        <span className="absolute left-0 top-1 w-3 h-3 rounded-full border-2 border-[#c4673f] bg-[#ffffff]" />
                        <p className="text-sm font-semibold">{u.title}</p>
                        <p className="text-xs text-[#6b655e] mt-0.5 truncate">{u.name}</p>
                        <span className={`inline-block mt-2 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${pill}`}>
                          {describeDeadline(u.due)}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>

            {/* Live activity */}
            <div className="ds-card rounded-[26px] bg-[#ffffff] border border-[#e8e2d9] p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex w-2.5 h-2.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-[#86b99f] opacity-75 animate-ping" />
                    <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-[#3f6e5b]" />
                  </span>
                  <p className="ds-serif text-2xl">Live activity</p>
                </div>
                <Layers className="w-4 h-4 text-[#a39c92]" />
              </div>

              {feed.length === 0 ? (
                <p className="mt-5 text-sm text-[#6b655e]">Client activity will show up here in real time.</p>
              ) : (
                <ul className="mt-5 space-y-2">
                  {feed.map((item, idx) => (
                    <li key={item._id} className="ds-card" style={{ animationDelay: `${idx * 70}ms` }}>
                      <button
                          onClick={() => {
                          realtime.markNotificationRead?.(item._id);
                          const to = notificationDestination(item);
                          if (to) navigate(to);
                        }}
                        className={`w-full text-left rounded-2xl px-4 py-3 border transition-colors hover:bg-[#faf7f2] ${
                          item.readAt ? "border-transparent opacity-60" : "border-[#f6dccb] bg-[#fdf6f1]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-sm font-semibold">{item.title}</span>
                          <span className="text-[10px] text-[#a39c92] whitespace-nowrap mt-0.5">{timeAgo(item.createdAt)}</span>
                        </div>
                        <p className="text-xs text-[#6b655e] mt-1 leading-relaxed line-clamp-2">{item.message}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}