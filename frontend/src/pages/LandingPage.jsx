import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Zap,
  ShieldCheck,
  Bot,
  Mic,
  Clock,
  TrendingUp,
  FileText,
  AlertTriangle,
  ChevronDown,
  Lock,
  Layers,
  Users,
  BarChart3,
  ExternalLink,
  MessageSquare,
  DollarSign,
  Play
} from "lucide-react";

export default function LandingPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    {
      question: "Do my clients need to create an account to view updates?",
      answer: "No! ClientSphere provides secure, zero-login public portal links for your clients. They can view project status, approve milestones, and leave comments effortlessly without sign-up friction."
    },
    {
      question: "How does the AI Scope Creep detector work?",
      answer: "ClientSphere analyzes incoming client requests and note edits against your original project brief and milestone scope. If new unbilled feature requests are detected, it alerts you with estimated extra hours and invoice adjustments."
    },
    {
      question: "Can I use the Voice Assistant on mobile?",
      answer: "Yes, ClientSphere's AI Voice Assistant works seamlessly on any browser supporting web speech recognition. You can record quick audio notes or ask for project summaries while away from your desk."
    },
    {
      question: "Is my client data and project code private?",
      answer: "Absolutely. We use enterprise-grade encryption for all stored files, database records, and AI prompts. Your data is never used to train public AI models."
    },
    {
      question: "Is there a free trial?",
      answer: "Yes! You can start with our fully-featured Free tier today with no credit card required."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Sticky Glass Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              ClientSphere
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-indigo-400 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-indigo-400 transition-colors">How It Works</a>
            <a href="#problem" className="hover:text-indigo-400 transition-colors">Why ClientSphere</a>
            <a href="#faq" className="hover:text-indigo-400 transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="text-sm font-medium text-slate-300 hover:text-white px-4 py-2 rounded-lg hover:bg-slate-900 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="group relative inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-cyan-500 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-24 md:pt-24 md:pb-32 overflow-hidden">
        {/* Glowing Ambient Backgrounds */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold tracking-wide uppercase mb-8 shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>AI-Powered Workspace for Freelancers & Agencies</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.15]">
            Never chase clients for updates{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-cyan-400 to-teal-300 bg-clip-text text-transparent">
              ever again.
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
            ClientSphere unifies milestones, feedback, automated AI weekly status reports, scope creep detection, and zero-login client portals in one sleek platform.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-cyan-500 text-base font-bold text-white shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
            >
              <span>Start Free Workspace</span>
              <ArrowRight className="w-5 h-5" />
            </Link>

            <Link
              to="/login"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-slate-900 border border-slate-800 text-base font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-all flex items-center justify-center gap-2.5"
            >
              <Play className="w-4 h-4 fill-current text-indigo-400" />
              <span>Explore Interactive Demo</span>
            </Link>
          </div>

          {/* Social Proof Badges */}
          <div className="mt-12 flex items-center justify-center gap-8 text-xs font-medium text-slate-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Zero-login client portals</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Instant setup in 60s</span>
            </div>
          </div>

          {/* Product Mockup */}
          <div className="mt-16 max-w-5xl mx-auto relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition duration-500" />
            
            <div className="relative rounded-2xl bg-slate-900 border border-slate-800/90 shadow-2xl overflow-hidden">
              {/* Window Header */}
              <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <div className="px-3 py-1 rounded-md bg-slate-900 border border-slate-800 text-xs font-mono text-slate-400 flex items-center gap-2">
                  <Lock className="w-3 h-3 text-indigo-400" />
                  <span>clientsphere.app/projects/nexus-brand-redesign</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Live Demo Mode
                  </span>
                </div>
              </div>

              {/* Mockup Navigation Tabs */}
              <div className="bg-slate-900/90 border-b border-slate-800 px-6 py-2.5 flex items-center gap-3 text-xs font-medium text-slate-400">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    activeTab === "overview"
                      ? "bg-indigo-600 text-white font-semibold"
                      : "hover:bg-slate-800 hover:text-slate-200"
                  }`}
                >
                  Overview & Health
                </button>
                <button
                  onClick={() => setActiveTab("ai_report")}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    activeTab === "ai_report"
                      ? "bg-indigo-600 text-white font-semibold"
                      : "hover:bg-slate-800 hover:text-slate-200"
                  }`}
                >
                  <Bot className="w-3.5 h-3.5 text-cyan-300" />
                  <span>AI Weekly Report</span>
                </button>
                <button
                  onClick={() => setActiveTab("scope")}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    activeTab === "scope"
                      ? "bg-indigo-600 text-white font-semibold"
                      : "hover:bg-slate-800 hover:text-slate-200"
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Scope Creep Alert</span>
                </button>
              </div>

              {/* Mockup Body Content */}
              <div className="p-6 md:p-8 text-left bg-gradient-to-b from-slate-900 to-slate-950 min-h-[380px]">
                {activeTab === "overview" && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                      <div>
                        <div className="text-xs font-medium text-slate-400">Client: Acme Corporation</div>
                        <h3 className="text-xl font-bold text-white">Nexus Brand & Web Platform Redesign</h3>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          Health: 94% (On Track)
                        </span>
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          Deadline: Oct 28
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                        <div className="text-xs font-medium text-slate-400 flex items-center justify-between">
                          <span>Milestone Status</span>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="mt-2 text-2xl font-bold text-white">4 / 5 Done</div>
                        <div className="mt-2 w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full w-4/5" />
                        </div>
                      </div>

                      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                        <div className="text-xs font-medium text-slate-400 flex items-center justify-between">
                          <span>Pending Client Approval</span>
                          <Clock className="w-4 h-4 text-amber-400" />
                        </div>
                        <div className="mt-2 text-2xl font-bold text-amber-300">Phase 3 Wireframes</div>
                        <div className="mt-1 text-xs text-slate-400">Client notified 2 hours ago</div>
                      </div>

                      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                        <div className="text-xs font-medium text-slate-400 flex items-center justify-between">
                          <span>AI Executive Summary</span>
                          <Bot className="w-4 h-4 text-cyan-400" />
                        </div>
                        <div className="mt-2 text-xs text-slate-300 leading-relaxed">
                          "Project velocity is 15% ahead of schedule. All high-priority frontend components delivered."
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "ai_report" && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <Bot className="w-5 h-5 text-cyan-400" />
                        <h4 className="text-base font-bold text-white">AI Weekly Client Summary Report</h4>
                      </div>
                      <span className="text-xs text-slate-400">Generated Oct 6, 2026</span>
                    </div>

                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
                      <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Highlights This Week</div>
                      <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
                        <li>Completed responsive navigation & dark mode component system.</li>
                        <li>Integrated secure Auth endpoints & Zod request validation.</li>
                        <li>Configured Cloudinary image delivery pipeline for design deliverables.</li>
                      </ul>

                      <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider pt-2">Next Week Focus</div>
                      <p className="text-xs text-slate-300">Final QA testing, client feedback integration, and production deployment.</p>
                    </div>
                  </div>
                )}

                {activeTab === "scope" && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-amber-300">Potential Scope Creep Detected</h4>
                        <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                          Client requested 3 additional custom animation requests in note "Feedback_v2". This was not included in the original project agreement (+6 estimated hours).
                        </p>
                        <div className="mt-3 flex items-center gap-3">
                          <button className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors">
                            Generate Change Order Invoice ($450)
                          </button>
                          <button className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-semibold text-xs hover:bg-slate-700">
                            Dismiss Alert
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section id="problem" className="py-20 bg-slate-900/60 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">The Problem</h2>
            <p className="mt-2 text-3xl sm:text-4xl font-extrabold text-white">
              Freelancing shouldn't feel like endless admin work.
            </p>
            <p className="mt-4 text-slate-400 text-base">
              Managing clients across fragmented emails, Slack channels, Google Docs, and spreadsheets costs you hours every week.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-950/80 p-8 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-6">
                <MessageSquare className="w-6 h-6 text-rose-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Scattered Feedback</h3>
              <p className="mt-3 text-sm text-slate-400 leading-relaxed">
                Client feedback gets lost across email threads, text messages, and comment threads, leading to repeated work.
              </p>
            </div>

            <div className="bg-slate-950/80 p-8 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6">
                <AlertTriangle className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Unpaid Scope Creep</h3>
              <p className="mt-3 text-sm text-slate-400 leading-relaxed">
                Small additional requests pile up without additional billing, eating away at your profit margin.
              </p>
            </div>

            <div className="bg-slate-950/80 p-8 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-6">
                <Clock className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Constant Status Requests</h3>
              <p className="mt-3 text-sm text-slate-400 leading-relaxed">
                Clients asking "Any updates?" every 2 days because they lack a transparent live view of progress.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Simple Workflow</h2>
            <p className="mt-2 text-3xl sm:text-4xl font-extrabold text-white">
              Up and running in 3 easy steps.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="bg-slate-900/50 p-8 rounded-2xl border border-slate-800 relative">
              <div className="text-5xl font-extrabold text-indigo-500/20 mb-4">01</div>
              <h3 className="text-xl font-bold text-white">Create & Invite</h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                Set up a project in seconds and generate a zero-login client link for your client.
              </p>
            </div>

            <div className="bg-slate-900/50 p-8 rounded-2xl border border-slate-800 relative">
              <div className="text-5xl font-extrabold text-indigo-500/20 mb-4">02</div>
              <h3 className="text-xl font-bold text-white">Work Naturally</h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                Add notes, check off tasks, and upload files. Everything syncs to the client portal automatically.
              </p>
            </div>

            <div className="bg-slate-900/50 p-8 rounded-2xl border border-slate-800 relative">
              <div className="text-5xl font-extrabold text-indigo-500/20 mb-4">03</div>
              <h3 className="text-xl font-bold text-white">Automate Reports</h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                Let AI generate weekly status summaries and alert you if scope creep is detected.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Showcase */}
      <section id="features" className="py-24 bg-slate-900/60 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Features</h2>
            <p className="mt-2 text-3xl sm:text-4xl font-extrabold text-white">
              Everything you need to deliver world-class client work.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
              <Layers className="w-8 h-8 text-indigo-400 mb-4" />
              <h3 className="text-lg font-bold text-white">Milestones & Tasks</h3>
              <p className="mt-2 text-sm text-slate-400">Keep deliverables structured and visible with real-time status indicators.</p>
            </div>

            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
              <Users className="w-8 h-8 text-cyan-400 mb-4" />
              <h3 className="text-lg font-bold text-white">Zero-Login Client Portal</h3>
              <p className="mt-2 text-sm text-slate-400">Share a link with clients to let them view progress without creating logins.</p>
            </div>

            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
              <Bot className="w-8 h-8 text-emerald-400 mb-4" />
              <h3 className="text-lg font-bold text-white">AI Weekly Reports</h3>
              <p className="mt-2 text-sm text-slate-400">Automatically generate executive summaries of weekly progress for stakeholders.</p>
            </div>

            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
              <AlertTriangle className="w-8 h-8 text-amber-400 mb-4" />
              <h3 className="text-lg font-bold text-white">Scope Creep Detector</h3>
              <p className="mt-2 text-sm text-slate-400">AI flags unbilled requests in client comments before they hurt your bottom line.</p>
            </div>

            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
              <Mic className="w-8 h-8 text-indigo-400 mb-4" />
              <h3 className="text-lg font-bold text-white">Voice Assistant</h3>
              <p className="mt-2 text-sm text-slate-400">Speak updates or record notes hands-free using integrated web speech AI.</p>
            </div>

            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
              <DollarSign className="w-8 h-8 text-emerald-400 mb-4" />
              <h3 className="text-lg font-bold text-white">Milestone Approvals</h3>
              <p className="mt-2 text-sm text-slate-400">Get client sign-offs on finished phases before moving to the next deliverable.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section id="faq" className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">FAQ</h2>
            <p className="mt-2 text-3xl font-extrabold text-white">Frequently Asked Questions</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden transition-all"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-6 text-left flex items-center justify-between gap-4 font-semibold text-white hover:text-indigo-400 transition-colors"
                >
                  <span>{faq.question}</span>
                  <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${openFaq === idx ? "rotate-180 text-indigo-400" : "text-slate-400"}`} />
                </button>
                {openFaq === idx && (
                  <div className="px-6 pb-6 text-sm text-slate-300 leading-relaxed border-t border-slate-800/50 pt-4 animate-fadeIn">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Banner */}
      <section className="py-20 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="bg-gradient-to-r from-indigo-900/90 via-indigo-800/80 to-slate-900 p-10 md:p-16 rounded-3xl border border-indigo-500/30 text-center shadow-2xl relative">
            <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
              Ready to transform your client relationships?
            </h2>
            <p className="mt-4 text-slate-200 text-base md:text-lg max-w-xl mx-auto">
              Join thousands of freelancers and agencies delivering transparent, stress-free work today.
            </p>
            <div className="mt-8 flex justify-center">
              <Link
                to="/register"
                className="px-8 py-4 rounded-xl bg-white text-slate-950 font-bold text-base hover:bg-slate-100 shadow-lg hover:scale-105 transition-all flex items-center gap-2"
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-5 h-5 text-indigo-600" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-12 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="font-semibold text-slate-200">ClientSphere</span>
            <span>© {new Date().getFullYear()} ClientSphere Inc. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
            <Link to="/login" className="hover:text-white transition-colors">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
