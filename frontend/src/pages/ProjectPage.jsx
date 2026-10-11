import React, { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useRealtime } from "../hooks/useRealtime.js";
import NotificationBell from "../components/NotificationBell.jsx";
import OnlineUsersPill from "../components/OnlineUsersPill.jsx";
import InvoiceTab from "../components/InvoiceTab.jsx";
import { ArrowLeft, CheckCircle2, StickyNote, FolderOpen, ListChecks, Receipt, UserCheck, Search as SearchIcon, BarChart3, Sparkles, Users, MessageSquare } from "lucide-react";

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

const TABS = ["Milestones", "Notes", "Files", "Tasks", "Invoices", "Client", "Search", "Analytics", "AI Reports", "Members", "Discussion"];

const TAB_ICONS = {
  Milestones: CheckCircle2,
  Notes: StickyNote,
  Files: FolderOpen,
  Tasks: ListChecks,
  Invoices: Receipt,
  Client: UserCheck,
  Search: SearchIcon,
  Analytics: BarChart3,
  "AI Reports": Sparkles,
  Members: Users,
  Discussion: MessageSquare,
};

const PP_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,400;1,9..144,500&display=swap');

.pp-serif { font-family: 'Fraunces', Georgia, serif; font-weight: 500; letter-spacing: -0.03em; }

@keyframes ppIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
.pp-hero { animation: ppIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) both; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
`;

export default function ProjectPage() {
  const { projectId } = useParams();
    const { user } = useAuth();
  const [searchParams] = useSearchParams();
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

  // Notifications link to /projects/:id?tab=Discussion etc. Open that tab when the URL asks for one.
  useEffect(() => {
    const requested = searchParams.get("tab");
    if (requested && TABS.includes(requested)) setTab(requested);
  }, [searchParams]);
  
  if (loading) return <div className="max-w-5xl mx-auto px-4 py-10 text-slate-400">Loading project...</div>;
  if (!project) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center space-y-3">
        <h1 className="text-xl font-bold text-white">We couldn't open this project</h1>
        <p className="text-sm text-slate-400">It may have been removed, or you may not have access to it.</p>
        <Link to="/dashboard" className="inline-block text-indigo-300 hover:text-white text-sm">Back to your projects</Link>
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

  const clientName = project.clientName && project.clientName !== "Client" ? project.clientName : "";

  return (
    <div className="max-w-5xl mx-auto px-4 pt-6 pb-8">
      <style>{PP_STYLES}</style>

      {/* Hero */}
      <div className="pp-hero relative z-30 rounded-[36px] bg-[#ffffff] border border-[#e8e2d9] p-7 md:p-10 shadow-[0_30px_70px_-45px_rgba(60,40,20,0.35)]">
        {/* Decorative glows live in their own clipped layer, so dropdowns can open outside the card */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[36px]">
          <div className="absolute -top-28 -right-24 w-96 h-96 rounded-full" style={{ background: "radial-gradient(circle, #f6dccb 0%, transparent 70%)" }} />
          <div className="absolute -bottom-32 -left-20 w-80 h-80 rounded-full" style={{ background: "radial-gradient(circle, #dcebe2 0%, transparent 70%)" }} />
        </div>

        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0 max-w-2xl">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 text-xs font-semibold text-[#6b655e] hover:text-[#1c1917] bg-[#faf7f2] border border-[#e8e2d9] px-3.5 py-1.5 rounded-full transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> All projects
            </Link>

            <p className="mt-8 text-[11px] uppercase tracking-[0.24em] text-[#c4673f]">Project</p>
            <h1 className="pp-serif text-5xl md:text-6xl mt-2 leading-[1.02]">{project.name}</h1>
            <p className="mt-4 text-[15px] text-[#6b655e] leading-relaxed">{project.description || "No description yet."}</p>

            {clientName && (
              <div className="mt-6 inline-flex items-center gap-3 pl-1.5 pr-4 py-1.5 rounded-full bg-[#dcebe2]/60 border border-[#bfe3cd]">
                <span className="w-8 h-8 rounded-full bg-[#ffffff] text-[#3f6e5b] pp-serif text-sm flex items-center justify-center">
                  {clientName.charAt(0).toUpperCase()}
                </span>
                <span className="text-xs font-semibold text-[#2f4a3e]">
                  {clientName}
                  {project.clientEmail ? <span className="font-normal text-[#4f6e61]"> · {project.clientEmail}</span> : null}
                </span>
              </div>
            )}
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

      {/* Tab dock: wraps onto more lines instead of scrolling, so no tab is cut off */}
      <nav className="relative z-10 mt-6" aria-label="Project sections">
        <div className="flex flex-wrap justify-center gap-1.5 p-2 rounded-[28px] bg-[#ffffff] border border-[#e8e2d9] shadow-[0_20px_50px_-30px_rgba(60,40,20,0.35)]">
          {visibleTabs.map((t) => {
            const Icon = TAB_ICONS[t];
            const active = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                aria-current={active ? "page" : undefined}
                className={`group inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all duration-300 ${
                  active
                    ? "bg-[#1c1917] text-[#faf7f2] shadow-[0_10px_24px_-12px_rgba(28,25,23,0.6)]"
                    : "text-[#6b655e] hover:bg-[#faf7f2] hover:text-[#1c1917]"
                }`}
              >
                {Icon && <Icon className={`w-4 h-4 transition-transform duration-300 ${active ? "" : "group-hover:-translate-y-0.5"}`} />}
                {t}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="mt-8">
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

        {tab === "Client" && isOwner && <ClientAccessPanel project={project} projectId={projectId} onProjectChanged={refreshProject} />}

        {tab === "Notes" && (
          <div className="space-y-4">
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
          <div className="space-y-4">
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

        {tab === "Members" && <MembersPanel project={project} currentUserId={user?._id} onUpdated={(p) => setProject(p)} />}

        {tab === "Discussion" && <CommentsPanel projectId={projectId} project={project} canShare={canEdit} />}
      </div>
    </div>
  );
}