import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/axios";
import {
  Sparkles,
  User,
  Briefcase,
  Users,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  FolderPlus,
  Rocket
} from "lucide-react";

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [roleType, setRoleType] = useState("freelancer");
  const [loading, setLoading] = useState(false);

  const [projectData, setProjectData] = useState({
    name: "",
    description: "",
    clientName: "",
    clientEmail: ""
  });

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!projectData.name.trim()) {
      return toast.error("Project name is required");
    }

    setLoading(true);
    try {
      // Client details are real project fields (not text stuffed into the description), so the
      // dashboard, milestones and the invite form can all use them.
      await api.post("/projects", {
        name: projectData.name.trim(),
        description: projectData.description.trim(),
        clientName: projectData.clientName.trim(),
        clientEmail: projectData.clientEmail.trim()
      });

      toast.success("First project created!");
      setStep(3);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-[160px] pointer-events-none" />

      {/* Header Logo */}
      <div className="mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <span className="text-2xl font-bold tracking-tight text-white">ClientSphere</span>
      </div>

      {/* Progress Indicators */}
      <div className="flex items-center gap-3 mb-8 w-full max-w-lg">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-2 flex-1 rounded-full transition-all duration-300 ${
              s <= step ? "bg-gradient-to-r from-indigo-500 to-cyan-400" : "bg-slate-800"
            }`}
          />
        ))}
      </div>

      {/* Card Container */}
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10 backdrop-blur-xl">
        {step === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Step 1 of 3</span>
              <h2 className="text-2xl font-bold text-white mt-1">How will you use ClientSphere?</h2>
              <p className="text-sm text-slate-400 mt-1">Choose the workspace mode that fits your setup best.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRoleType("freelancer")}
                className={`p-6 rounded-2xl border text-left transition-all ${
                  roleType === "freelancer"
                    ? "bg-indigo-500/10 border-indigo-500 ring-2 ring-indigo-500/30 text-white"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
                  <User className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-base text-white">Solo Freelancer</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Independent designer, developer, or consultant working directly with clients.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setRoleType("agency")}
                className={`p-6 rounded-2xl border text-left transition-all ${
                  roleType === "agency"
                    ? "bg-indigo-500/10 border-indigo-500 ring-2 ring-indigo-500/30 text-white"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-base text-white">Agency / Team</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Studio or agency managing multiple client accounts with collaborators.
                </p>
              </button>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.01] transition-all flex items-center justify-center gap-2"
            >
              <span>Continue to Next Step</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleCreateProject} className="space-y-5 animate-fadeIn">
            <div className="text-center">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Step 2 of 3</span>
              <h2 className="text-2xl font-bold text-white mt-1">Create Your First Project</h2>
              <p className="text-sm text-slate-400 mt-1">Set up a workspace for your current or upcoming client project.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Project Name *
              </label>
              <input
                type="text"
                value={projectData.name}
                onChange={(e) => setProjectData({ ...projectData, name: e.target.value })}
                placeholder="e.g. Website Redesign & Brand Strategy"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Client Name
                </label>
                <input
                  type="text"
                  value={projectData.clientName}
                  onChange={(e) => setProjectData({ ...projectData, clientName: e.target.value })}
                  placeholder="e.g. Acme Corp"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Client Email
                </label>
                <input
                  type="email"
                  value={projectData.clientEmail}
                  onChange={(e) => setProjectData({ ...projectData, clientEmail: e.target.value })}
                  placeholder="client@acme.com"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Short Description / Scope Summary
              </label>
              <textarea
                value={projectData.description}
                onChange={(e) => setProjectData({ ...projectData, description: e.target.value })}
                placeholder="Briefly describe project deliverables or milestones..."
                rows={3}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-5 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold text-slate-300 transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.01] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{loading ? "Creating Project..." : "Create & Finalize"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <div className="text-center space-y-6 animate-fadeIn py-4">
            <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl flex items-center justify-center mx-auto text-emerald-400">
              <Rocket className="w-10 h-10 animate-bounce" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white">Your Workspace is Ready!</h2>
              <p className="text-sm text-slate-400 mt-2 max-w-sm mx-auto">
                We've configured your workspace and pre-populated your dashboard with live project cards and tools.
              </p>
            </div>

            <button
              onClick={() => navigate("/dashboard")}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-cyan-500 text-sm font-bold text-white shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.01] transition-all flex items-center justify-center gap-2"
            >
              <span>Go to My Dashboard</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}