import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Lock,
  Bot,
  AlertTriangle,
  Layers,
  FileText,
  MessageSquare,
  Search,
  Mail,
  Users,
  Play,
  Menu,
  X,
  Plus,
  Minus,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,400;1,9..144,500&display=swap');

.ls-serif { font-family: 'Fraunces', Georgia, serif; font-weight: 500; letter-spacing: -0.03em; }

.ls-dots {
  background-image: radial-gradient(#1c191712 1px, transparent 1px);
  background-size: 22px 22px;
}

.ls-underline {
  background-image: linear-gradient(transparent 62%, #f6dccb 62%, #f6dccb 92%, transparent 92%);
  background-repeat: no-repeat;
  padding: 0 0.08em;
}

@keyframes lsFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-9px); } }
@keyframes lsMarquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@keyframes lsBar { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes lsIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes lsRise { from { opacity: 0; transform: translateY(48px) rotate(var(--r, 0deg)); } to { opacity: 1; transform: translateY(0) rotate(var(--r, 0deg)); } }
@keyframes lsGrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes lsPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }

.ls-fade { animation: lsIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
.ls-rise { animation: lsRise 1s cubic-bezier(0.16, 1, 0.3, 1) both; }
.ls-reveal { opacity: 0; transform: translateY(24px); transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
.ls-reveal.is-visible { opacity: 1; transform: none; }
.ls-line { transform-origin: left; animation: lsGrow 1.6s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both; }
.ls-live { animation: lsPulse 1.8s ease-in-out infinite; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
  .ls-reveal { opacity: 1; transform: none; }
}
`;

const NAV = [
  { label: "Problem", href: "#problem" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Product", href: "#product" },
  { label: "FAQ", href: "#faq" },
];

const TICKER = [
  "Brief to proposal",
  "Client portal, no login",
  "Email invites",
  "AI progress updates",
  "Scope check",
  "Milestones and approvals",
  "Live notifications",
  "Plain-language search",
];

const SWAPS = [
  { before: "Writing the same Friday status email again", after: "An AI-drafted progress update, ready for you to review" },
  { before: "Scope quietly growing in direct messages", after: "Every request checked against the agreed scope" },
  { before: "Approvals buried in forty-message threads", after: "One page where every approval and change lives" },
  { before: "Invoices sent late, or not at all", after: "An invoice drafted the moment work is approved" },
];

const STEPS = [
  { n: "01", title: "Set up the project", text: "Add milestones with due dates and prices, plus the scope you agreed on." },
  { n: "02", title: "Share a private link", text: "Your client opens the portal from email. There is nothing to sign up for." },
  { n: "03", title: "Let the updates write themselves", text: "AI drafts your weekly update from real progress. You review it, then send." },
];

const FEATURES = [
  {
    icon: Sparkles,
    title: "Brief to proposal",
    text: "Paste a client's email or call notes. AI drafts the scope, milestones, prices and due dates, and you review everything before it is added.",
    points: ["Scope summary and 3 to 6 milestones", "Assumptions to check before you commit", "Edit every line, then add it in one click"],
    tint: "#f6dccb",
    ink: "#a4502d",
    big: true,
  },
  {
    icon: Lock,
    title: "Client portal, no login",
    text: "Your client opens a private link to approve milestones, leave feedback and download documents. No account, no password.",
    points: ["One secure link per project", "Clients see only what you share", "Approve or request changes from one page"],
    tint: "#dcebe2",
    ink: "#3f6e5b",
  },
  {
    icon: Mail,
    title: "Invite by email",
    text: "Send a client their private link straight from the app. If email isn't set up, copy the same link and send it yourself.",
    points: ["Invite with a name and an email", "Invite links expire automatically", "Revoke access at any time"],
    tint: "#e4eef7",
    ink: "#3d6584",
  },
  {
    icon: Bot,
    title: "AI progress updates",
    text: "Your weekly update is drafted from real milestones and activity, in plain language. Nothing reaches your client until you press send.",
    points: ["Drafted from real progress", "Edit anything before you send", "Download it as a text file"],
    tint: "#f7ecc9",
    ink: "#8a6418",
  },
  {
    icon: AlertTriangle,
    title: "Scope check",
    text: "Every client request is compared with the agreed scope. You see the reason and a polite reply ready to copy.",
    points: ["Flags work outside the agreed scope", "Suggests a reply you can copy", "Keeps a record of every request"],
    tint: "#f9e1d6",
    ink: "#a4502d",
  },
  {
    icon: Layers,
    title: "Milestones and approvals",
    text: "Submit a deliverable, get an approval or a change request, and keep the full history on both sides.",
    points: ["Clear status for every deliverable", "Approvals logged with timestamps", "Progress rolls up to project health"],
    tint: "#efe6f0",
    ink: "#6e4a78",
  },
  {
    icon: FileText,
    title: "Notes and files that think",
    text: "Explain, improve and extract tasks from notes. Upload a new version of a file and get an AI review of what changed.",
    points: ["Explain and improve notes", "Turn action items into tasks", "AI review of every new file version"],
    tint: "#e4eef7",
    ink: "#3d6584",
  },
  {
    icon: Search,
    title: "Search in plain English",
    text: "Ask where you decided something and get the answer with its source, across notes, files and messages.",
    points: ["Answers cite their sources", "Find files by name as you type", "Searches notes, files and messages"],
    tint: "#dcebe2",
    ink: "#3f6e5b",
  },
  {
    icon: MessageSquare,
    title: "Private by default",
    text: "Team discussion stays internal until you share it. Mention a teammate with @ and they are notified straight away.",
    points: ["Internal unless you share", "@mentions send a live notification", "Attach screenshots to messages"],
    tint: "#f9e1d6",
    ink: "#a4502d",
  },
];

const AUDIENCE = [
  { name: "Freelance designers", desc: "Keep revisions, approvals and feedback out of your inbox, so you can focus on the work." },
  { name: "Developers and studios", desc: "Track milestones against scope and show clients real progress without extra meetings." },
  { name: "Marketing agencies", desc: "Run several client accounts side by side and never miss a deadline or approval." },
  { name: "Consultants", desc: "Send clear weekly updates that prove value and make scope changes easy to agree on." },
  { name: "Writers and editors", desc: "Share drafts, versions and feedback in one place, with comments your clients can follow." },
  { name: "Video producers", desc: "Keep cut versions, approvals and invoices linked, so every stage is easy to trace." },
];

const FAQS = [
  { q: "How do my clients get access?", a: "You invite them with their email, and they get a private link. You can also copy the link and send it yourself." },
  { q: "Do my clients need an account?", a: "No. They open the private link and see only what you share with them." },
  { q: "Who sees my internal notes and team chat?", a: "Only your team. Everything stays internal until you choose to share it." },
  { q: "Does the AI send updates on its own?", a: "No. It drafts them, and you review, edit and press send." },
  { q: "Can I try it for free?", a: "Yes. No credit card is needed to get started." },
];

const PRODUCT_ITEMS = {
  team: {
    milestones: [
      { name: "Discovery", value: 100, status: "Approved", color: "#3f6e5b" },
      { name: "Design", value: 80, status: "In review", color: "#c4673f" },
      { name: "Development", value: 45, status: "In progress", color: "#e0a46f" },
    ],
    comments: [
      { tag: "Internal", text: "Budget is tight on dev, push back on the extra pages." },
      { tag: "Shared", text: "Homepage wireframes are ready for your review." },
    ],
  },
  client: {
    milestones: [
      { name: "Discovery", value: 100, status: "Approved", color: "#3f6e5b" },
      { name: "Design", value: 80, status: "Awaiting your approval", color: "#c4673f" },
      { name: "Development", value: 45, status: "In progress", color: "#e0a46f" },
    ],
    comments: [{ tag: "Shared", text: "Homepage wireframes are ready for your review." }],
  },
};

function useReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return [ref, visible];
}

function Reveal({ children, delay = 0, className = "" }) {
  const [ref, visible] = useReveal();
  return (
    <div ref={ref} className={`ls-reveal ${visible ? "is-visible" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/* ---------- Hero ---------- */

function HeroDesk() {
  return (
    <div className="relative h-[460px] md:h-[500px] mt-16">
      {/* Left: client portal card */}
      <div
        className="ls-rise hidden md:block absolute left-0 top-16 w-[230px] bg-[#ffffff] rounded-3xl border border-[#e8e2d9] shadow-xl p-5"
        style={{ "--r": "-5deg", animationDelay: "0.25s" }}
      >
        <div className="flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-wider text-[#6b655e]">Client portal</p>
          <span className="w-1.5 h-1.5 rounded-full bg-[#3f6e5b] ls-live" />
        </div>
        <p className="ls-serif text-lg mt-2">Acme Corporation</p>
        <div className="mt-4 space-y-2.5">
          {["Homepage wireframes", "Colour system", "Final assets"].map((t, i) => (
            <div key={t} className="flex items-center gap-2 text-xs">
              <span className={`w-4 h-4 rounded-full flex items-center justify-center ${i === 0 ? "bg-[#3f6e5b]" : "bg-[#f1ece4]"}`}>
                {i === 0 && <CheckCircle2 className="w-3 h-3 text-[#faf7f2]" />}
              </span>
              <span className={i === 0 ? "text-[#6b655e] line-through" : "text-[#1c1917]"}>{t}</span>
            </div>
          ))}
        </div>
        <div className="mt-5 text-[11px] font-semibold text-[#c4673f]">Review 2 files →</div>
      </div>

      {/* Centre: main dashboard */}
      <div
        className="ls-rise absolute left-1/2 -translate-x-1/2 top-0 w-full md:w-[480px] bg-[#ffffff] rounded-3xl border border-[#e8e2d9] shadow-[0_40px_90px_-30px_rgba(60,40,20,0.35)] overflow-hidden z-10"
        style={{ "--r": "0deg", animationDelay: "0.05s" }}
      >
        <div className="flex items-center gap-1.5 px-4 py-3 border-b border-[#e8e2d9] bg-[#faf7f2]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#f2b8a0]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#f7e3a1]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#b9dccb]" />
          <span className="ml-3 text-[11px] text-[#6b655e] font-mono truncate">clientsphere.app/acme-brand</span>
        </div>
        <div className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-[#6b655e]">Acme Corporation</p>
              <p className="ls-serif text-2xl mt-1">Brand Redesign</p>
            </div>
            <span className="text-xs font-semibold text-[#3f6e5b] bg-[#dcebe2] px-2.5 py-1 rounded-full whitespace-nowrap">Healthy</span>
          </div>
          <div className="mt-6 space-y-4">
            {[
              { n: "Discovery", s: "Approved", v: 100, c: "#3f6e5b", d: "0.4s" },
              { n: "Design", s: "In review", v: 80, c: "#c4673f", d: "0.6s" },
              { n: "Development", s: "In progress", v: 45, c: "#e0a46f", d: "0.8s" },
            ].map((m) => (
              <div key={m.n}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-medium">{m.n}</span>
                  <span className="text-[#6b655e]">{m.s}</span>
                </div>
                <div className="h-2 rounded-full bg-[#f1ece4] overflow-hidden">
                  <div
                    className="h-full rounded-full origin-left"
                    style={{ width: `${m.v}%`, background: m.c, animation: "lsBar 1.4s cubic-bezier(0.16, 1, 0.3, 1) both", animationDelay: m.d }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: report card */}
      <div
        className="ls-rise hidden md:block absolute right-0 top-28 w-[220px] bg-[#1c1917] text-[#faf7f2] rounded-3xl shadow-xl p-5"
        style={{ "--r": "4deg", animationDelay: "0.45s" }}
      >
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-[#f6dccb]">
          <Bot className="w-3.5 h-3.5" /> AI weekly update
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-[#e9e2d6]">
          Design is in review and development is 45% done. Two files need your feedback this week.
        </p>
        <div className="mt-4 text-[11px] font-semibold text-[#f6dccb]">Review, then send →</div>
      </div>

      <FloatChip className="absolute -left-2 md:left-10 bottom-4 md:bottom-0" delay="0s" icon={CheckCircle2} tone="sage" title="Milestone 2 approved" sub="Invoice drafted automatically" />
      <FloatChip className="absolute right-0 md:right-4 -bottom-2 md:bottom-6" delay="1.4s" icon={AlertTriangle} tone="clay" title="Scope check" sub="Request is outside the agreed scope" />
    </div>
  );
}

const TONES = {
  sage: "bg-[#dcebe2] text-[#3f6e5b]",
  clay: "bg-[#f9e1d6] text-[#a4502d]",
  butter: "bg-[#f7ecc9] text-[#8a6418]",
};

function FloatChip({ className, delay, icon: Icon, tone, title, sub }) {
  return (
    <div
      className={`${className} z-20 flex items-center gap-3 bg-[#ffffff] rounded-2xl border border-[#e8e2d9] shadow-lg px-4 py-3`}
      style={{ animation: "lsFloat 6s ease-in-out infinite", animationDelay: delay }}
    >
      <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${TONES[tone]}`}>
        <Icon className="w-4 h-4" />
      </span>
      <div>
        <p className="text-sm font-semibold leading-tight">{title}</p>
        <p className="text-xs text-[#6b655e] mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

/* ---------- How it works: timeline with mini mockups ---------- */

function StepVisual({ index }) {
  if (index === 0) {
    return (
      <div className="space-y-2">
        {["Discovery", "Design", "Development"].map((m) => (
          <div key={m} className="flex items-center justify-between bg-[#faf7f2] border border-[#e8e2d9] rounded-xl px-3 py-2 text-xs">
            <span className="font-medium">{m}</span>
            <span className="w-2 h-2 rounded-full bg-[#3f6e5b]" />
          </div>
        ))}
      </div>
    );
  }
  if (index === 1) {
    return (
      <div className="bg-[#faf7f2] border border-[#e8e2d9] rounded-xl p-3">
        <p className="text-[11px] text-[#6b655e] font-mono truncate">clientsphere.app/p/acme-brand</p>
        <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold bg-[#1c1917] text-[#faf7f2] px-3 py-1.5 rounded-full">
          Copy client link <ArrowUpRight className="w-3 h-3" />
        </div>
      </div>
    );
  }
  return (
    <div className="bg-[#faf7f2] border border-[#e8e2d9] rounded-xl p-4 space-y-2">
      <div className="h-2 w-full rounded bg-[#e8e2d9]" />
      <div className="h-2 w-11/12 rounded bg-[#e8e2d9]" />
      <div className="h-2 w-8/12 rounded bg-[#e8e2d9]" />
      <div className="pt-2 flex justify-end">
        <span className="text-[11px] font-semibold text-[#3f6e5b] bg-[#dcebe2] px-2.5 py-1 rounded-full">Review and send</span>
      </div>
    </div>
  );
}

/* ---------- Features: master-detail ---------- */

function FeatureExplorer() {
  const [active, setActive] = useState(0);
  const feature = FEATURES[active];
  const Icon = feature.icon;

  return (
    <div className="grid lg:grid-cols-12 gap-10 items-start">
      <div className="lg:col-span-5 lg:sticky lg:top-24">
        <div className="flex flex-col divide-y divide-[#e8e2d9] border-y border-[#e8e2d9]">
          {FEATURES.map((f, i) => {
            const FIcon = f.icon;
            const on = i === active;
            return (
              <button
                key={f.title}
                onClick={() => setActive(i)}
                onMouseEnter={() => setActive(i)}
                className={`group flex items-center gap-4 py-4 text-left transition-all duration-300 ${on ? "pl-4" : "pl-0"}`}
              >
                <span className={`w-1 self-stretch rounded-full transition-colors ${on ? "bg-[#c4673f]" : "bg-transparent"}`} />
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${on ? "bg-[#1c1917]" : "bg-[#f1ece4]"}`}>
                  <FIcon className={`w-4 h-4 ${on ? "text-[#faf7f2]" : "text-[#6b655e]"}`} />
                </span>
                <span className={`text-[15px] transition-colors ${on ? "text-[#1c1917] font-semibold" : "text-[#6b655e] group-hover:text-[#1c1917]"}`}>
                  {f.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="lg:col-span-7">
        <div key={active} className="ls-fade relative overflow-hidden rounded-[32px] p-8 md:p-12 min-h-[440px] border border-[#e8e2d9]" style={{ background: feature.tint }}>
          <div aria-hidden="true" className="absolute inset-0 ls-dots opacity-70 pointer-events-none" />
          <div className="relative">
            <span className="w-14 h-14 rounded-2xl bg-[#ffffff] flex items-center justify-center shadow-sm">
              <Icon className="w-6 h-6" style={{ color: feature.ink }} />
            </span>
            <h3 className="ls-serif text-4xl md:text-5xl mt-8 leading-[1.05]">{feature.title}</h3>
            <p className="mt-5 text-[16px] leading-relaxed text-[#3a342e] max-w-xl">{feature.text}</p>
            <ul className="mt-8 space-y-3">
              {feature.points.map((p) => (
                <li key={p} className="flex items-center gap-3 text-sm text-[#1c1917]">
                  <span className="w-5 h-5 rounded-full bg-[#ffffff] flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" style={{ color: feature.ink }} />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Highlights: three bold cards under the features ---------- */

function Highlights() {
    const items = [
    {
      icon: Bot,
      eyebrow: "AI",
      title: "Weekly updates in minutes, not evenings",
      text: "Drafted from real progress, reviewed by you, then sent to the client's portal.",
      bg: "#1c1917",
      fg: "#faf7f2",
      accent: "#f6dccb",
    },
    {
      icon: AlertTriangle,
      eyebrow: "Protection",
      title: "Catch scope creep before it costs you",
      text: "Every client request is checked against what you agreed, with a polite reply ready to copy.",
      bg: "#f9e1d6",
      fg: "#1c1917",
      accent: "#a4502d",
    },
    {
      icon: Sparkles,
      eyebrow: "Onboarding",
      title: "From a client email to a plan in seconds",
      text: "Paste the brief. Review the milestones, prices and scope AI drafts, then add them to the project in one click.",
      bg: "#dcebe2",
      fg: "#1c1917",
      accent: "#3f6e5b",
    },
  ];
  return (
    <div className="grid md:grid-cols-3 gap-5">
      {items.map((it, i) => {
        const Icon = it.icon;
        return (
          <Reveal key={it.title} delay={i * 100}>
            <div className="h-full rounded-[28px] p-8 flex flex-col" style={{ background: it.bg, color: it.fg }}>
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] font-semibold" style={{ color: it.accent }}>
                <Icon className="w-4 h-4" /> {it.eyebrow}
              </div>
              <h4 className="ls-serif text-3xl mt-6 leading-[1.1]">{it.title}</h4>
              <p className="mt-4 text-sm leading-relaxed opacity-80">{it.text}</p>
            </div>
          </Reveal>
        );
      })}
    </div>
  );
}

/* ---------- Product: window frame + team/client toggle ---------- */

function TiltFrame({ children }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: py * -5, y: px * 7 });
  };

  return (
    <div className="[perspective:1400px]">
      <div
        onMouseMove={onMove}
        onMouseLeave={() => setTilt({ x: 0, y: 0 })}
        className="rounded-[28px] bg-[#ffffff] border border-[#e8e2d9] shadow-[0_50px_100px_-40px_rgba(60,40,20,0.35)] overflow-hidden transition-transform duration-300 ease-out"
        style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
      >
        {children}
      </div>
    </div>
  );
}

function ProductShowcase() {
  const [mode, setMode] = useState("team");
  const data = PRODUCT_ITEMS[mode];

  return (
    <div>
      <div className="flex justify-center mb-10">
        <div className="inline-flex p-1.5 rounded-full bg-[#ffffff] border border-[#e8e2d9]">
          {[
            { id: "team", label: "Your team's view", icon: Layers },
            { id: "client", label: "Client's view", icon: Users },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                mode === m.id ? "bg-[#1c1917] text-[#faf7f2] shadow-[0_10px_24px_-14px_rgba(28,25,23,0.7)]" : "text-[#6b655e] hover:text-[#1c1917]"
              }`}
            >
              <m.icon className="w-4 h-4" />
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <TiltFrame>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8e2d9] bg-[#faf7f2]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f2b8a0]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#f7e3a1]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#b9dccb]" />
          </div>
          <span className="text-[11px] font-mono text-[#6b655e]">
            {mode === "team" ? "clientsphere.app/projects/acme-brand" : "portal.clientsphere.app/acme-brand"}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#3f6e5b]">
            {mode === "team" ? <Layers className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
            {mode === "team" ? "Internal" : "Shared"}
          </span>
        </div>

        <div key={mode} className="ls-fade grid md:grid-cols-5">
          <div className="md:col-span-3 p-8 md:p-10 space-y-6">
            <div>
              <p className="text-xs text-[#6b655e]">Acme Corporation</p>
              <p className="ls-serif text-3xl mt-1">Brand Redesign</p>
            </div>
            {data.milestones.map((m) => (
              <div key={m.name}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium">{m.name}</span>
                  <span className="text-[#6b655e]">{m.status}</span>
                </div>
                <div className="h-2.5 rounded-full bg-[#f1ece4] overflow-hidden">
                  <div className="h-full rounded-full origin-left" style={{ width: `${m.value}%`, background: m.color, animation: "lsBar 1s cubic-bezier(0.16,1,0.3,1) both" }} />
                </div>
              </div>
            ))}
          </div>

          <div className="md:col-span-2 border-t md:border-t-0 md:border-l border-[#e8e2d9] bg-[#faf7f2] p-8 space-y-4">
            <p className="text-xs uppercase tracking-wider text-[#6b655e]">Discussion</p>
            {data.comments.map((c) => (
              <div key={c.text} className={`rounded-2xl p-4 text-sm leading-relaxed border ${c.tag === "Internal" ? "bg-[#f4efe7] border-[#e8e2d9]" : "bg-[#ffffff] border-[#dcebe2]"}`}>
                <span
                  className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full mb-2 ${
                    c.tag === "Internal" ? "bg-[#e8e2d9] text-[#5b5246]" : "bg-[#dcebe2] text-[#3f6e5b]"
                  }`}
                >
                  {c.tag}
                </span>
                <p>{c.text}</p>
              </div>
            ))}
            {mode === "client" && <p className="text-xs text-[#6b655e] pt-2">Internal notes are hidden from the client's portal.</p>}
          </div>
        </div>
      </TiltFrame>
    </div>
  );
}

/* ---------- Audience: typographic list ---------- */

function AudienceList() {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="grid lg:grid-cols-12 gap-10">
      <div className="lg:col-span-7 divide-y divide-[#e8e2d9] border-y border-[#e8e2d9]">
        {AUDIENCE.map((a, i) => (
          <button key={a.name} onMouseEnter={() => setHovered(i)} onFocus={() => setHovered(i)} className="w-full flex items-center justify-between gap-4 py-6 text-left group">
            <span className={`ls-serif text-3xl md:text-4xl transition-all duration-300 ${hovered === i ? "text-[#c4673f] italic translate-x-3" : "text-[#1c1917]"}`}>
              {a.name}
            </span>
            <ArrowRight className={`w-6 h-6 shrink-0 transition-all duration-300 ${hovered === i ? "opacity-100 text-[#c4673f] translate-x-0" : "opacity-0 -translate-x-3"}`} />
          </button>
        ))}
      </div>
      <div className="lg:col-span-5 lg:sticky lg:top-24 self-start">
        <div className="relative overflow-hidden rounded-[28px] bg-[#f4efe7] p-10 min-h-[260px] flex flex-col justify-end">
          <div aria-hidden="true" className="absolute inset-0 ls-dots opacity-60 pointer-events-none" />
          <p className="relative text-xs uppercase tracking-wider text-[#6b655e]">Built for</p>
          <p key={hovered} className="relative ls-fade ls-serif text-2xl leading-snug mt-4">
            {AUDIENCE[hovered].desc}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---------- Footer column ---------- */

function FooterCol({ title, links, span = "md:col-span-3" }) {
  return (
    <div className={span}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#1c1917]">{title}</p>
      <ul className="mt-5 space-y-3">
        {links.map((l) => (
          <li key={l.label}>
            {l.to ? (
              <Link to={l.to} className="text-sm text-[#6b655e] hover:text-[#1c1917] transition-colors">
                {l.label}
              </Link>
            ) : (
              <a href={l.href} className="text-sm text-[#6b655e] hover:text-[#1c1917] transition-colors">
                {l.label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- Page ---------- */

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="min-h-screen bg-[#faf7f2] text-[#1c1917] font-sans overflow-x-hidden selection:bg-[#f6dccb]">
      <style>{STYLES}</style>

      {/* Header */}
      <header className={`sticky top-0 z-50 transition-all duration-300 border-b ${scrolled ? "bg-[#faf7f2]/90 backdrop-blur-xl border-[#e8e2d9]" : "bg-transparent border-transparent"}`}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#1c1917] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#f6dccb]" />
            </span>
            <span className="font-semibold tracking-tight">ClientSphere</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm text-[#6b655e]">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="hover:text-[#1c1917] transition-colors">
                {n.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium px-4 py-2 hover:text-[#c4673f] transition-colors">
              Sign in
            </Link>
            <Link to="/register" className="text-sm font-semibold bg-[#1c1917] text-[#faf7f2] px-4 py-2.5 rounded-full hover:bg-[#c4673f] transition-colors">
              Start free
            </Link>
          </div>

          <button className="md:hidden p-2 -mr-2" onClick={() => setMenuOpen((o) => !o)} aria-label="Toggle menu">
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-[#e8e2d9] bg-[#faf7f2] px-5 py-5 flex flex-col gap-4 text-sm">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} onClick={closeMenu} className="text-[#1c1917]">
                {n.label}
              </a>
            ))}
            <Link to="/login" onClick={closeMenu} className="text-[#1c1917]">
              Sign in
            </Link>
            <Link to="/register" onClick={closeMenu} className="text-center font-semibold bg-[#1c1917] text-[#faf7f2] px-4 py-3 rounded-full">
              Start free
            </Link>
          </div>
        )}
      </header>

      {/* 1. Hero */}
      <section className="relative pt-12 md:pt-20 pb-12 overflow-hidden">
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[700px] pointer-events-none ls-dots opacity-50" style={{ maskImage: "linear-gradient(#000, transparent 85%)" }} />
        <div className="absolute inset-x-0 top-0 h-[700px] pointer-events-none" style={{ background: "radial-gradient(55% 50% at 50% 0%, #f6dccb80 0%, transparent 70%)" }} />
        <div className="relative max-w-7xl mx-auto px-5 sm:px-8 text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 text-xs font-medium text-[#3f6e5b] bg-[#dcebe2] px-3 py-1.5 rounded-full">
              <Sparkles className="w-3.5 h-3.5" />
              Client work, finally in order
            </span>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="ls-serif mt-8 mx-auto max-w-5xl text-[46px] sm:text-7xl lg:text-[88px] leading-[0.98]">
              Your clients stay informed. <span className="ls-underline italic text-[#c4673f]">You stop chasing them.</span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-7 mx-auto max-w-2xl text-lg leading-relaxed text-[#6b655e]">
              ClientSphere is the workspace for freelancers and agencies. Milestones, approvals, invoices and weekly updates live in one
              calm place. Your clients get a private link instead of another login.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/register" className="group inline-flex items-center justify-center gap-2 bg-[#1c1917] text-[#faf7f2] px-7 py-3.5 rounded-full font-semibold hover:bg-[#c4673f] transition-colors shadow-[0_18px_40px_-18px_rgba(28,25,23,0.7)]">
                Start free
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <a href="#how-it-works" className="inline-flex items-center justify-center gap-2 bg-[#ffffff] border border-[#e8e2d9] px-7 py-3.5 rounded-full font-semibold hover:border-[#1c1917] transition-colors">
                <Play className="w-4 h-4 fill-current" />
                See how it works
              </a>
            </div>
            <ul className="mt-7 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-[#6b655e]">
              {["No credit card needed", "Clients need no login", "Set up in about a minute"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#3f6e5b]" />
                  {t}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={200}>
            <HeroDesk />
          </Reveal>
        </div>
      </section>

      {/* Ticker */}
      <div className="border-y border-[#e8e2d9] bg-[#ffffff] py-5 overflow-hidden">
        <div className="flex w-max gap-10 whitespace-nowrap text-sm font-medium text-[#6b655e]" style={{ animation: "lsMarquee 30s linear infinite" }}>
          {[...TICKER, ...TICKER].map((t, i) => (
            <span key={i} className="flex items-center gap-10">
              <span>{t}</span>
              <span className="text-[#c4673f]">•</span>
            </span>
          ))}
        </div>
      </div>

      {/* 2. Problem */}
      <section id="problem" className="py-28">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5 lg:sticky lg:top-28 self-start">
            <Reveal>
              <p className="text-sm font-semibold text-[#c4673f] uppercase tracking-wider">The problem</p>
              <h2 className="ls-serif text-4xl md:text-6xl mt-4 leading-[1.02]">
                Good work shouldn't get lost in <em className="italic">your inbox.</em>
              </h2>
              <p className="mt-6 text-[#6b655e] leading-relaxed max-w-md">
                Every week, freelancers rewrite the same status email. Scope grows through a quick favour in chat. Approvals hide in
                forty-message threads, and invoices go out late. ClientSphere takes those jobs off your plate, so your hours go into
                the work clients pay for.
              </p>
            </Reveal>
          </div>
          <div className="lg:col-span-7 divide-y divide-[#e8e2d9] border-y border-[#e8e2d9]">
            {SWAPS.map((s, i) => (
              <Reveal key={s.before} delay={i * 90}>
                <div className="grid md:grid-cols-[1fr_auto_1fr] gap-4 md:gap-8 items-center py-8">
                  <p className="text-[#6b655e] line-through decoration-[#c4673f]/60 decoration-2">{s.before}</p>
                  <ArrowRight className="hidden md:block w-5 h-5 text-[#c4673f]" />
                  <p className="ls-serif text-2xl text-[#1c1917]">{s.after}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 3. How it works */}
      <section id="how-it-works" className="py-28 bg-[#f4efe7]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <Reveal className="max-w-2xl">
            <p className="text-sm font-semibold text-[#3f6e5b] uppercase tracking-wider">How it works</p>
            <h2 className="ls-serif text-4xl md:text-6xl mt-4 leading-[1.02]">From kickoff to a happy client in three steps.</h2>
          </Reveal>

          <div className="relative mt-20 grid md:grid-cols-3 gap-12 md:gap-8">
            <div className="hidden md:block absolute left-0 right-0 top-[22px] h-px bg-[#e8e2d9]">
              <div className="ls-line h-px bg-[#c4673f] w-full" />
            </div>
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 180}>
                <div>
                  <span className="relative z-10 w-11 h-11 rounded-full bg-[#1c1917] flex items-center justify-center text-sm font-semibold text-[#faf7f2] shadow-[0_10px_24px_-10px_rgba(28,25,23,0.7)]">
                    {s.n}
                  </span>
                  <h3 className="ls-serif text-2xl mt-8">{s.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#6b655e] max-w-xs">{s.text}</p>
                  <div className="mt-7">
                    <StepVisual index={i} />
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Features */}
      <section id="features" className="py-28">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <Reveal className="max-w-3xl">
            <p className="text-sm font-semibold text-[#c4673f] uppercase tracking-wider">Features</p>
            <h2 className="ls-serif text-4xl md:text-6xl mt-4 leading-[1.02]">Everything between the first call and the final invoice.</h2>
          </Reveal>
          <Reveal delay={100} className="mt-16">
            <FeatureExplorer />
          </Reveal>
          <div className="mt-20">
            <Highlights />
          </div>
        </div>
      </section>

      {/* 5. Product */}
      <section id="product" className="py-28 bg-[#f4efe7]">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <Reveal className="text-center max-w-2xl mx-auto">
            <p className="text-sm font-semibold text-[#3f6e5b] uppercase tracking-wider">See it in action</p>
            <h2 className="ls-serif text-4xl md:text-6xl mt-4 leading-[1.02]">Your team sees everything. Clients see what you share.</h2>
          </Reveal>
          <Reveal delay={120} className="mt-16">
            <ProductShowcase />
          </Reveal>
        </div>
      </section>

      {/* 6. Audience */}
      <section className="py-28">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <Reveal className="max-w-2xl">
            <p className="text-sm font-semibold text-[#c4673f] uppercase tracking-wider">Built for</p>
            <h2 className="ls-serif text-4xl md:text-6xl mt-4 leading-[1.02]">Independent work that needs to look professional.</h2>
          </Reveal>
          <Reveal delay={100} className="mt-14">
            <AudienceList />
          </Reveal>
        </div>
      </section>

      {/* 7. FAQ */}
      <section id="faq" className="py-28 bg-[#f4efe7]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-4 self-start lg:sticky lg:top-28">
            <Reveal>
              <p className="text-sm font-semibold text-[#3f6e5b] uppercase tracking-wider">FAQ</p>
              <h2 className="ls-serif text-4xl md:text-5xl mt-4 leading-[1.02]">Questions, answered.</h2>
              <p className="mt-5 text-[#6b655e] leading-relaxed">Still curious? Start a free workspace and explore it yourself.</p>
            </Reveal>
          </div>
          <div className="lg:col-span-8 divide-y divide-[#e8e2d9] border-y border-[#e8e2d9]">
            {FAQS.map((f, i) => {
              const open = openFaq === i;
              return (
                <Reveal key={f.q} delay={i * 70}>
                  <div>
                    <button onClick={() => setOpenFaq(open ? null : i)} className="w-full flex items-start gap-6 text-left py-7" aria-expanded={open}>
                      <span className="ls-serif text-sm text-[#c4673f] pt-1 w-8 shrink-0">0{i + 1}</span>
                      <span className="flex-1 ls-serif text-2xl leading-snug">{f.q}</span>
                      <span className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center transition-colors ${open ? "bg-[#1c1917] text-[#faf7f2]" : "border border-[#e8e2d9]"}`}>
                        {open ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      </span>
                    </button>
                    {open && <p className="ls-fade pb-8 pl-14 pr-14 text-[15px] leading-relaxed text-[#6b655e]">{f.a}</p>}
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* 8. Final CTA */}
      <section className="pt-28">
        <Reveal>
          <div className="relative overflow-hidden bg-[#f6dccb]">
            <div aria-hidden="true" className="absolute inset-0 ls-dots opacity-60 pointer-events-none" />
            <div className="max-w-6xl mx-auto px-5 sm:px-8 py-24 md:py-32 text-center relative">
              <h2 className="ls-serif text-5xl md:text-7xl leading-[0.98] max-w-4xl mx-auto">
                Your next client update should take <em className="italic text-[#a4502d]">zero minutes.</em>
              </h2>
              <p className="mt-7 text-[#3a342e] max-w-xl mx-auto text-lg">Set up your first project in about a minute, and invite your client today.</p>
              <div className="mt-11 flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/register" className="group inline-flex items-center justify-center gap-2 bg-[#1c1917] text-[#faf7f2] px-8 py-4 rounded-full font-semibold hover:bg-[#a4502d] transition-colors">
                  Start free
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link to="/login" className="inline-flex items-center justify-center px-8 py-4 rounded-full font-semibold border border-[#1c1917]/30 hover:border-[#1c1917] transition-colors">
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

                 {/* Footer */}
      <footer className="relative overflow-hidden border-t border-[#e8e2d9] bg-[#faf7f2]">
        {/* Wordmark sits behind the footer content as a soft background */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center select-none">
          <p className="ls-serif whitespace-nowrap text-[17vw] leading-none pb-[0.2em] text-[#1c1917]/[0.06]">
            ClientSphere
          </p>
        </div>

        <div className="relative max-w-7xl mx-auto px-5 sm:px-8 py-16">
          <div className="grid gap-12 md:grid-cols-12">
            <div className="md:col-span-6">
              <Link to="/" className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-lg bg-[#1c1917] flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-[#f6dccb]" />
                </span>
                <span className="font-semibold tracking-tight text-lg">ClientSphere</span>
              </Link>
              <p className="mt-5 max-w-sm text-sm leading-relaxed text-[#6b655e]">
                The calm workspace for freelancers and agencies. Milestones, approvals, invoices and weekly updates, with clients who
                never need a login.
              </p>
            </div>

            <FooterCol
              title="Product"
              links={[
                { label: "Features", href: "#features" },
                { label: "How it works", href: "#how-it-works" },
                { label: "Client portal", href: "#product" },
                { label: "FAQ", href: "#faq" },
              ]}
            />
            <FooterCol
              title="Get started"
              links={[
                { label: "Create an account", to: "/register" },
                { label: "Sign in", to: "/login" },
              ]}
            />
          </div>

          <div className="mt-14 pt-6 border-t border-[#e8e2d9] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#6b655e]">
            <p>© {new Date().getFullYear()} ClientSphere. All rights reserved.</p>
            <p>Built for freelancers who would rather be building.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}