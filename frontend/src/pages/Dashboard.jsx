import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/axios.js";
import HealthBadge from "../components/HealthBadge.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useRealtime } from "../hooks/useRealtime.js";
import NotificationBell from "../components/NotificationBell.jsx";
import {
  Sparkles,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FolderKanban,
  ExternalLink,
  Search,
  ArrowRight,
  TrendingUp,
  X,
  FileText,
  DollarSign,
  Briefcase,
  Layers,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
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

  // "in 3 days" / "2 days overdue" for the deadline line on each card.
  const describeDeadline = (dueDate) => {
    const days = Math.ceil((new Date(dueDate).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);
    if (days === 0) return "today";
    if (days === 1) return "tomorrow";
    return days > 1 ? `in ${days} days` : `${Math.abs(days)} day${days === -1 ? "" : "s"} overdue`;
  };

  return (
    <div className="min-h-screen bg-slate-950 dark:bg-slate-950 light:bg-slate-50 text-slate-100 dark:text-slate-100 light:text-slate-900 font-sans selection:bg-indigo-500 selection:text-white pb-20 bg-radial-gradient">
      {/* Top Header Bar */}
      <div className="border-b border-slate-800/80 dark:border-slate-800/80 light:border-slate-200 bg-slate-950/60 dark:bg-slate-950/60 light:bg-white/70 backdrop-blur-xl sticky top-16 z-30 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 font-bold text-lg">
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white dark:text-white light:text-slate-900 leading-snug tracking-tight">
                  Welcome back, {user?.name || "Workspace"}
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 dark:text-indigo-400 light:text-indigo-600 border border-indigo-500/20">
                  PRO
                </span>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-500">
                Workspace overview & project analytics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="hidden md:flex items-center gap-2 px-3.5 py-2 bg-slate-900/90 dark:bg-slate-900/90 light:bg-white border border-slate-800 dark:border-slate-800 light:border-slate-200 rounded-xl text-xs text-slate-300 w-64 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all shadow-sm">
              <Search className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent focus:outline-none w-full placeholder-slate-500 text-slate-100 dark:text-slate-100 light:text-slate-900 text-xs"
              />
            </div>

            <NotificationBell
              notifications={realtime.notifications}
              unreadCount={realtime.unreadCount}
              onMarkRead={realtime.markNotificationRead}
              onMarkAllRead={realtime.markAllRead}
            />

            <button
              onClick={() => setShowForm(!showForm)}
              className="btn btn-primary text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>New Project</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Summary Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              label: "Active Projects",
              value: summary.activeProjects ?? projects.length,
              note: projects.length ? "Across your workspace" : "Create your first project",
              tone: "text-white dark:text-white light:text-slate-900",
              noteTone: "text-slate-400 light:text-slate-500",
              icon: FolderKanban,
              iconBg: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400 dark:text-indigo-400 light:text-indigo-600",
            },
            {
              label: "Awaiting Approval",
              value: summary.pendingApprovals || 0,
              note: summary.pendingApprovals ? "Milestones under review" : "No pending approvals",
              tone: summary.pendingApprovals ? "text-amber-400 dark:text-amber-300 light:text-amber-600" : "text-white dark:text-white light:text-slate-900",
              noteTone: summary.pendingApprovals ? "text-amber-400 dark:text-amber-400 light:text-amber-600" : "text-slate-400 light:text-slate-500",
              icon: Clock,
              iconBg: "bg-amber-500/10 border-amber-500/20 text-amber-400 dark:text-amber-400 light:text-amber-600",
            },
            {
              label: "Overdue Invoices",
              value: summary.overdueInvoices || 0,
              note: summary.overdueInvoices ? "Follow up required" : "All invoices paid",
              tone: summary.overdueInvoices ? "text-rose-400 dark:text-rose-300 light:text-rose-600" : "text-white dark:text-white light:text-slate-900",
              noteTone: summary.overdueInvoices ? "text-rose-400 dark:text-rose-400 light:text-rose-600" : "text-slate-400 light:text-slate-500",
              icon: DollarSign,
              iconBg: "bg-rose-500/10 border-rose-500/20 text-rose-400 dark:text-rose-400 light:text-rose-600",
            },
            {
              label: "Scope Alerts",
              value: summary.scopeAlerts || 0,
              note: summary.scopeAlerts ? "Recent scope requests" : "No scope creep flagged",
              tone: summary.scopeAlerts ? "text-cyan-400 dark:text-cyan-300 light:text-cyan-600" : "text-white dark:text-white light:text-slate-900",
              noteTone: summary.scopeAlerts ? "text-cyan-400 dark:text-cyan-400 light:text-cyan-600" : "text-slate-400 light:text-slate-500",
              icon: ShieldAlert,
              iconBg: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400 dark:text-cyan-400 light:text-cyan-600",
            },
          ].map((card) => (
            <div
              key={card.label}
              className="card bg-slate-900/80 dark:bg-slate-900/80 light:bg-white border-slate-800/80 dark:border-slate-800/80 light:border-slate-200/80 p-5 rounded-2xl flex items-center justify-between gap-4 hover:border-slate-700/80 dark:hover:border-slate-700/80 light:hover:border-slate-300 transition-all duration-200 shadow-sm"
            >
              <div className="min-w-0 space-y-1">
                <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 light:text-slate-500 uppercase tracking-wider">
                  {card.label}
                </div>
                <div className={`text-3xl font-extrabold tracking-tight ${card.tone}`}>
                  {loading ? "–" : card.value}
                </div>
                <div className={`text-[11px] font-medium ${card.noteTone}`}>
                  {card.note}
                </div>
              </div>
              <div className={`w-12 h-12 flex-shrink-0 rounded-2xl border flex items-center justify-center ${card.iconBg} shadow-inner`}>
                <card.icon className="w-6 h-6" />
              </div>
            </div>
          ))}
        </div>

        {/* Create Project Inline Form Modal */}
        {showForm && (
          <form
            onSubmit={handleCreate}
            className="bg-slate-900/90 dark:bg-slate-900/90 light:bg-white border border-slate-800 dark:border-slate-800 light:border-slate-200 p-6 rounded-2xl space-y-5 animate-fadeIn shadow-xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 dark:border-slate-800 light:border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Briefcase className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white dark:text-white light:text-slate-900">
                  Create New Workspace Project
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-slate-400 hover:text-white dark:hover:text-white light:hover:text-slate-900 p-1 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-800 light:hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 dark:text-slate-300 light:text-slate-700 uppercase tracking-wider mb-2">
                  Project Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. E-Commerce Redesign"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 dark:text-slate-300 light:text-slate-700 uppercase tracking-wider mb-2">
                  Client Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Acme Corp"
                  value={form.clientName}
                  onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                  className="input"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 dark:text-slate-300 light:text-slate-700 uppercase tracking-wider mb-2">
                Client Email (Optional)
              </label>
              <input
                type="email"
                placeholder="client@acme.com. You can invite them to the portal later"
                value={form.clientEmail}
                onChange={(e) => setForm({ ...form, clientEmail: e.target.value })}
                className="input"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 dark:text-slate-300 light:text-slate-700 uppercase tracking-wider mb-2">
                Project Scope / Description
              </label>
              <textarea
                rows={3}
                placeholder="Briefly describe key deliverables, timeline and milestones..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="input resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="btn btn-primary text-xs px-6"
              >
                {creating ? "Creating..." : "Save Project"}
              </button>
            </div>
          </form>
        )}

        {/* Project Workspaces Header & Grid */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-white dark:text-white light:text-slate-900 tracking-tight">
                Project Workspaces
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-500">
                Manage active client projects and track progress
              </p>
            </div>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-800/80 dark:bg-slate-800/80 light:bg-slate-200 text-slate-300 dark:text-slate-300 light:text-slate-700">
              {filteredProjects.length} active workspace{filteredProjects.length === 1 ? "" : "s"}
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" aria-busy="true" aria-label="Loading projects">
              {[0, 1, 2].map((i) => (
                <div key={i} className="card p-6 space-y-4 animate-pulse">
                  <div className="h-4 w-1/3 rounded bg-slate-800/60 dark:bg-slate-800/60 light:bg-slate-200" />
                  <div className="h-6 w-2/3 rounded bg-slate-800/60 dark:bg-slate-800/60 light:bg-slate-200" />
                  <div className="h-3 w-full rounded bg-slate-800/60 dark:bg-slate-800/60 light:bg-slate-200" />
                  <div className="h-3 w-4/5 rounded bg-slate-800/60 dark:bg-slate-800/60 light:bg-slate-200" />
                </div>
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="card p-12 text-center space-y-4 max-w-lg mx-auto">
              <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                <FolderKanban className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white dark:text-white light:text-slate-900">
                  No projects found
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-500 mt-1">
                  Start by creating your first client project or add a sample template.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setShowForm(true)}
                  className="btn btn-primary text-xs"
                >
                  Create Custom Project
                </button>
                <button
                  onClick={handleSeedSampleProject}
                  disabled={creating}
                  className="btn btn-secondary text-xs"
                >
                  Add Sample Template
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((p) => {
                const clientName = p.clientName || "";
                const sm = p.summary || {};
                const total = sm.milestonesTotal || 0;
                const percent = total ? Math.round((sm.milestonesApproved / total) * 100) : 0;
                const late = sm.nextDeadline ? new Date(sm.nextDeadline.dueDate) < new Date() : false;

                return (
                  <div
                    key={p._id}
                    className="card p-6 flex flex-col justify-between space-y-5 transition-all duration-200 group hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-0.5"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 flex-shrink-0 rounded-lg bg-indigo-500/20 text-indigo-300 font-bold text-xs flex items-center justify-center border border-indigo-500/30">
                            {(clientName || p.name).charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs font-semibold text-slate-400 dark:text-slate-400 light:text-slate-600 truncate">
                            {clientName || "No client yet"}
                          </span>
                        </div>

                        <HealthBadge projectId={p._id} />
                      </div>

                      <h3 className="text-base font-bold text-white dark:text-white light:text-slate-900 group-hover:text-indigo-400 transition-colors leading-snug">
                        {p.name}
                      </h3>

                      <p className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                        {p.description || "No detailed scope added."}
                      </p>

                      {total > 0 && (
                        <div className="mt-4 space-y-1.5">
                          <div className="flex justify-between text-[11px] font-medium text-slate-400 dark:text-slate-400 light:text-slate-600">
                            <span>
                              {sm.milestonesApproved} of {total} milestones approved
                            </span>
                            <span className="font-bold text-slate-300 dark:text-slate-300 light:text-slate-700">{percent}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-800 dark:bg-slate-800 light:bg-slate-200 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-500"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {(sm.pendingApprovals > 0 || sm.changesRequested > 0 || sm.overdueInvoices > 0 || sm.scopeAlerts > 0) && (
                        <div className="flex flex-wrap gap-1.5 mt-3.5">
                          {sm.pendingApprovals > 0 && (
                            <span className="badge bg-amber-500/10 text-amber-300 dark:text-amber-300 light:text-amber-700 border-amber-500/30">
                              {sm.pendingApprovals} awaiting client
                            </span>
                          )}
                          {sm.changesRequested > 0 && (
                            <span className="badge bg-orange-500/10 text-orange-300 dark:text-orange-300 light:text-orange-700 border-orange-500/30">
                              {sm.changesRequested} changes requested
                            </span>
                          )}
                          {sm.overdueInvoices > 0 && (
                            <span className="badge bg-rose-500/10 text-rose-300 dark:text-rose-300 light:text-rose-700 border-rose-500/30">
                              {sm.overdueInvoices} overdue invoice{sm.overdueInvoices > 1 ? "s" : ""}
                            </span>
                          )}
                          {sm.scopeAlerts > 0 && (
                            <span className="badge bg-indigo-500/10 text-indigo-300 dark:text-indigo-300 light:text-indigo-700 border-indigo-500/30">
                              {sm.scopeAlerts} scope alert{sm.scopeAlerts > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-slate-800/80 dark:border-slate-800/80 light:border-slate-200/80 flex items-center justify-between gap-3">
                      <div className={`text-[11px] font-medium flex items-center gap-1.5 min-w-0 ${late ? "text-rose-400" : "text-slate-400 dark:text-slate-400 light:text-slate-500"}`}>
                        <Clock className="w-3.5 h-3.5 flex-shrink-0" />
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
                        className="btn btn-primary text-xs px-3 py-1.5 rounded-lg flex-shrink-0"
                      >
                        <span>Open</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}