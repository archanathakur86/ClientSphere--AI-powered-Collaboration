import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useRealtime } from "../hooks/useRealtime.js";
import NotificationBell from "../components/NotificationBell.jsx";
import OnlineUsersPill from "../components/OnlineUsersPill.jsx";
import InvoiceTab from "../components/InvoiceTab.jsx";

import NoteEditor from "../components/NoteEditor.jsx";
import NotesList from "../components/NotesList.jsx";
import FileUpload from "../components/FileUpload.jsx";
import FileList from "../components/FileList.jsx";
import AnalyticsPanel from "../components/AnalyticsPanel.jsx";
import HealthBadge from "../components/HealthBadge.jsx";
import SearchBar from "../components/SearchBar.jsx";
import ReportGenerator from "../components/ReportGenerator.jsx";
import TaskList from "../components/TaskList.jsx";
import MembersPanel from "../components/MembersPanel.jsx";
import CommentsPanel from "../components/CommentsPanel.jsx";
import MilestonesTab from "../components/MilestonesTab.jsx";
import ClientAccessPanel from "../components/ClientAccessPanel.jsx";

import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Folder,
  CheckSquare,
  DollarSign,
  UserCheck,
  Search,
  BarChart3,
  Sparkles,
  Users,
  MessageSquare,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

const TABS = [
  "Milestones",
  "Notes",
  "Files",
  "Tasks",
  "Invoices",
  "Client",
  "Search",
  "Analytics",
  "AI Reports",
  "Members",
  "Discussion",
];

const TAB_ICONS = {
  Milestones: CheckCircle2,
  Notes: FileText,
  Files: Folder,
  Tasks: CheckSquare,
  Invoices: DollarSign,
  Client: UserCheck,
  Search: Search,
  Analytics: BarChart3,
  "AI Reports": Sparkles,
  Members: Users,
  Discussion: MessageSquare,
};

export default function ProjectPage() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [notes, setNotes] = useState([]);
  const [files, setFiles] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [tab, setTab] = useState("Milestones");
  const [dataVersion, setDataVersion] = useState(0); // bumps when something changes elsewhere (e.g. the client approves)
  const [loading, setLoading] = useState(true);
  const [healthRefreshKey, setHealthRefreshKey] = useState(0);
  const realtime = useRealtime({ projectId, enabled: !!user });

  const bumpHealth = () => setHealthRefreshKey((k) => k + 1);

  // `silent` refreshes in the background without swapping the page for a loading screen,
  // so the open tab and anything typed into it survive.
  const loadAll = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [projRes, notesRes, filesRes, invoicesRes] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get(`/projects/${projectId}/notes`),
        api.get(`/projects/${projectId}/files`),
        // Invoices are owner/editor only. Viewers get 403 here; that must not break the page.
        api.get(`/projects/${projectId}/invoices`).catch(() => ({ data: { invoices: [] } })),
      ]);
      setProject(projRes.data.project);
      setNotes(notesRes.data.notes);
      setFiles(filesRes.data.files);
      setInvoices(invoicesRes.data.invoices || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load project");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Live: when the client approves, requests changes, comments or pays, refresh quietly.
  useEffect(() => {
    const socket = realtime.socket;
    if (!socket) return undefined;
    const refresh = () => {
      loadAll({ silent: true });
      setDataVersion((v) => v + 1);
      bumpHealth();
    };
    socket.on("notification:new", refresh);
    return () => socket.off("notification:new", refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realtime.socket]);

  if (loading)
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center text-slate-400">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm font-medium">Loading workspace project details...</p>
      </div>
    );

  if (!project) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="card p-8 space-y-4">
          <h1 className="text-xl font-bold text-white">We couldn't open this project</h1>
          <p className="text-xs text-slate-400">It may have been removed, or you may not have access to it.</p>
          <Link to="/dashboard" className="btn btn-primary text-xs inline-flex">
            Back to your projects
          </Link>
        </div>
      </div>
    );
  }

  // Only owner/editor can see invoices (the API enforces it; this just hides the empty tab).
  const myId = String(user?._id || "");
  const isOwner = String(project.owner?._id || project.owner || "") === myId;
  const myMember = (project.members || []).find((m) => String(m.user?._id || m.user || "") === myId);
  const canEdit = isOwner || myMember?.role === "editor";
  const canSeeInvoices = canEdit;
  // Only the owner manages client access (the API enforces the same rule).
  const visibleTabs = TABS.filter((t) => (t !== "Invoices" || canSeeInvoices) && (t !== "Client" || isOwner));
  const refreshProject = () => loadAll({ silent: true });

  return (
    <div className="min-h-screen bg-slate-950 dark:bg-slate-950 light:bg-slate-50 text-slate-100 dark:text-slate-100 light:text-slate-900 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Back Link */}
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 dark:text-slate-400 light:text-slate-600 hover:text-white dark:hover:text-white light:hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>

        {/* Project Header Banner */}
        <div className="card bg-slate-900/90 dark:bg-slate-900/90 light:bg-white p-6 rounded-2xl border-slate-800 dark:border-slate-800 light:border-slate-200 shadow-md">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-400 dark:text-indigo-400 light:text-indigo-600 border border-indigo-500/20">
                  {project.clientName || "Internal Project"}
                </span>
                {project.clientEmail && (
                  <span className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-500">
                    ({project.clientEmail})
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white dark:text-white light:text-slate-900 tracking-tight">
                {project.name}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-400 light:text-slate-600 leading-relaxed">
                {project.description || "No description specified."}
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap justify-end">
              <OnlineUsersPill users={realtime.onlineUsers} />
              <NotificationBell
                notifications={realtime.notifications}
                unreadCount={realtime.unreadCount}
                onMarkRead={realtime.markNotificationRead}
                onMarkAllRead={realtime.markAllRead}
              />
              <HealthBadge projectId={projectId} refreshKey={healthRefreshKey} />
            </div>
          </div>
        </div>

        {/* Dynamic Navigation Tabs Bar */}
        <div className="flex gap-1.5 p-1.5 bg-slate-900/80 dark:bg-slate-900/80 light:bg-slate-200/80 border border-slate-800/80 dark:border-slate-800/80 light:border-slate-300 rounded-2xl overflow-x-auto no-scrollbar shadow-inner">
          {visibleTabs.map((t) => {
            const Icon = TAB_ICONS[t];
            const isActive = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-all duration-150 ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 dark:text-slate-400 light:text-slate-700 hover:text-white dark:hover:text-white light:hover:text-slate-900 hover:bg-slate-800/60 dark:hover:bg-slate-800/60 light:hover:bg-slate-100"
                }`}
              >
                {Icon && <Icon className="w-3.5 h-3.5" />}
                <span>{t}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Contents */}
        <div className="pt-2">
          {tab === "Milestones" && (
            <MilestonesTab
              projectId={projectId}
              project={project}
              canEdit={canEdit}
              refreshKey={dataVersion}
              onChanged={() => {
                bumpHealth();
                refreshProject();
              }}
              onGoToClient={isOwner ? () => setTab("Client") : undefined}
            />
          )}

          {tab === "Client" && isOwner && (
            <ClientAccessPanel project={project} projectId={projectId} onProjectChanged={refreshProject} />
          )}

          {tab === "Notes" && (
            <div className="space-y-6">
              <NoteEditor
                projectId={projectId}
                onCreated={(n) => {
                  setNotes((prev) => [n, ...prev]);
                  bumpHealth();
                }}
              />
              <NotesList
                notes={notes}
                canEdit={canEdit}
                onDeleted={(id) => {
                  setNotes((prev) => prev.filter((n) => n._id !== id));
                  bumpHealth();
                }}
                onUpdated={(updated) => {
                  setNotes((prev) => prev.map((n) => (n._id === updated._id ? updated : n)));
                  bumpHealth();
                }}
              />
            </div>
          )}

          {tab === "Files" && (
            <div className="space-y-6">
              <FileUpload
                projectId={projectId}
                onUploaded={(f) => {
                  setFiles((prev) => [f, ...prev]);
                  bumpHealth();
                }}
              />
              <FileList
                files={files}
                projectId={projectId}
                canEdit={canEdit}
                onUpdated={(updated) => setFiles((prev) => prev.map((f) => (f._id === updated._id ? updated : f)))}
                onDeleted={(id) => {
                  setFiles((prev) => prev.filter((f) => f._id !== id));
                  bumpHealth();
                }}
              />
            </div>
          )}

          {tab === "Tasks" && <TaskList projectId={projectId} />}

          {tab === "Invoices" && (
            <InvoiceTab
              invoices={invoices}
              onSend={async (invoiceId) => {
                try {
                  await api.post(`/invoices/${invoiceId}/send`);
                  toast.success("Invoice sent to the client");
                  refreshProject();
                } catch (err) {
                  toast.error(err.response?.data?.message || "Couldn't send the invoice");
                }
              }}
              onSave={async (invoiceId, patch) => {
                try {
                  await api.patch(`/invoices/${invoiceId}`, patch);
                  toast.success("Invoice updated");
                  refreshProject();
                  return true;
                } catch (err) {
                  toast.error(err.response?.data?.message || "Couldn't update the invoice");
                  return false;
                }
              }}
              onDownload={async (invoiceId) => {
                const res = await api.get(`/invoices/${invoiceId}/pdf`, { responseType: "blob" });
                const url = URL.createObjectURL(res.data);
                const link = document.createElement("a");
                link.href = url;
                link.download = `invoice-${invoiceId}.pdf`;
                document.body.appendChild(link);
                link.click();
                link.remove();
                setTimeout(() => URL.revokeObjectURL(url), 60000);
              }}
            />
          )}

          {tab === "Search" && <SearchBar projectId={projectId} />}

          {tab === "Analytics" && <AnalyticsPanel projectId={projectId} />}

          {tab === "AI Reports" && (
            <ReportGenerator
              projectId={projectId}
              project={project}
              initialReadme={project.readme}
              onReadmeGenerated={(readme) => setProject((p) => ({ ...p, readme }))}
            />
          )}

          {tab === "Members" && (
            <MembersPanel project={project} currentUserId={user?._id} onUpdated={(p) => setProject(p)} />
          )}

          {tab === "Discussion" && <CommentsPanel projectId={projectId} project={project} canShare={canEdit} />}
        </div>
      </div>
    </div>
  );
}