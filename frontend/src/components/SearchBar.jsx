import React, { useState } from "react";
import toast from "react-hot-toast";
import api from "../api/axios.js";
import { Search, Sparkles, FileText, StickyNote, MessageSquare, Flag, ArrowRight, Loader2 } from "lucide-react";

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,400;1,9..144,500&display=swap');

.sb-serif { font-family: 'Fraunces', Georgia, serif; font-weight: 500; letter-spacing: -0.025em; }

@keyframes sbIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes sbShimmer { from { background-position: -200% 0; } to { background-position: 200% 0; } }
.sb-in { animation: sbIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
.sb-card { animation: sbIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) backwards; }
.sb-shimmer {
  background: linear-gradient(90deg, #f1ece4 0%, #f6dccb 50%, #f1ece4 100%);
  background-size: 200% 100%;
  animation: sbShimmer 1.6s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
`;

const EXAMPLES = [
  "Where did we discuss the homepage?",
  "What did the client ask to change?",
  "Which files mention pricing?",
];

// Each source type gets its own tint so the results are easy to scan.
const TYPE_STYLE = {
  note: { label: "Note", bg: "#f6dccb", ink: "#a4502d", icon: StickyNote },
  file: { label: "File", bg: "#dcebe2", ink: "#3f6e5b", icon: FileText },
  comment: { label: "Message", bg: "#efe6f0", ink: "#6e4a78", icon: MessageSquare },
  milestone: { label: "Milestone", bg: "#f7ecc9", ink: "#8a6418", icon: Flag },
};

const typeOf = (type = "") => TYPE_STYLE[type] || { label: type || "Source", bg: "#f1ece4", ink: "#6b655e", icon: FileText };

const inputCls =
  "w-full pl-12 pr-4 py-4 bg-[#ffffff] border border-[#e8e2d9] rounded-full text-base placeholder-[#a39c92] focus:outline-none focus:border-[#c4673f] focus:ring-4 focus:ring-[#f6dccb]/60 transition-all";

export default function SearchBar({ projectId }) {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const runSearch = async (text) => {
    if (!text.trim() || text.trim().length < 2) {
      toast.error("Type at least 2 characters");
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const res = await api.get(`/projects/${projectId}/ai/search`, { params: { q: text } });
      setAnswer(res.data.answer || "");
      setSources(res.data.sources || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Search failed");
      setAnswer("");
      setSources([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    runSearch(query);
  };

  const askExample = (text) => {
    setQuery(text);
    runSearch(text);
  };

  const noResults = searched && !loading && !answer && sources.length === 0;

  return (
    <div className="space-y-10">
      <style>{STYLES}</style>

      {/* Hero */}
      <div className="sb-in">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[#c4673f]">Ask your project</p>
        <h3 className="sb-serif text-5xl md:text-6xl mt-3 leading-[1.02] max-w-3xl">
          Find any decision, <em className="italic text-[#c4673f]">in plain English.</em>
        </h3>
        <p className="mt-4 text-[#6b655e] max-w-2xl leading-relaxed">
          Search across notes, files and client messages. Answers link back to the exact place they came from.
        </p>

        <form onSubmit={handleSearch} className="mt-8 relative max-w-3xl">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6b655e] pointer-events-none" />
          <input
            className={inputCls}
            placeholder="e.g. where did we discuss auth retry logic"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            disabled={loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-2 text-sm font-semibold bg-[#1c1917] text-[#faf7f2] pl-4 pr-5 py-3 rounded-full hover:bg-[#c4673f] transition-colors disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? "Searching" : "Ask"}
          </button>
        </form>

        {!searched && (
          <div className="mt-5 flex flex-wrap gap-2 max-w-3xl">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => askExample(ex)}
                className="inline-flex items-center gap-2 text-xs font-semibold text-[#6b655e] bg-[#ffffff] border border-[#e8e2d9] px-4 py-2 rounded-full hover:border-[#c4673f] hover:text-[#a4502d] transition-colors"
              >
                {ex}
                <ArrowRight className="w-3 h-3" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-4 max-w-3xl" aria-busy="true">
          <div className="sb-shimmer h-36 rounded-[28px]" />
          <div className="sb-shimmer h-24 rounded-[24px]" />
        </div>
      )}

      {/* Results */}
      {searched && !loading && (
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-4">
            {answer && (
              <div className="sb-card rounded-[32px] bg-[#ffffff] border border-[#e8e2d9] p-8 md:p-9 relative overflow-hidden shadow-[0_30px_70px_-45px_rgba(60,40,20,0.35)]">
                <span className="absolute -top-8 -left-2 sb-serif text-[150px] leading-none text-[#f6dccb]">“</span>
                <div className="relative">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#a4502d] font-semibold flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5" /> Answer
                  </p>
                  <p className="sb-serif italic text-2xl md:text-[28px] leading-snug text-[#2b2620] mt-4 whitespace-pre-wrap">{answer}</p>
                </div>
              </div>
            )}

            {noResults && (
              <div className="rounded-[28px] border-2 border-dashed border-[#d9d1c4] bg-[#ffffff] p-10 text-center">
                <p className="sb-serif text-3xl">Nothing matched that.</p>
                <p className="mt-3 text-sm text-[#6b655e] leading-relaxed">Try different words, or ask about a specific note, file or client message.</p>
              </div>
            )}
          </div>

          <div className="lg:col-span-5">
            {sources.length > 0 && (
              <>
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#6b655e] mb-4">Sources · {sources.length}</p>
                <div className="space-y-3">
                  {sources.map((source, i) => {
                    const t = typeOf(source.type);
                    const Icon = t.icon;
                    return (
                      <div
                        key={source.id}
                        className="sb-card rounded-[24px] bg-[#ffffff] border border-[#e8e2d9] p-5 hover:shadow-[0_20px_44px_-30px_rgba(60,40,20,0.35)] transition-shadow duration-300"
                        style={{ animationDelay: `${i * 80}ms` }}
                      >
                        <div className="flex items-start gap-4">
                          <span className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: t.bg, color: t.ink }}>
                            <Icon className="w-4 h-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: t.bg, color: t.ink }}>
                                {t.label}
                              </span>
                            </div>
                            <p className="sb-serif text-xl leading-snug mt-2 truncate">{source.title}</p>
                            <p className="text-sm text-[#6b655e] mt-1.5 leading-relaxed line-clamp-3">{source.snippet}…</p>
                            {source.sourceRef && (
                              <p className="text-[11px] italic text-[#a4502d] mt-3">{source.sourceRef}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}