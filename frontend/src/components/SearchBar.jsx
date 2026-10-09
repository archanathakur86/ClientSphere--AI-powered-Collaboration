import React, { useState } from "react";
import toast from "react-hot-toast";
import api from "../api/axios.js";
import { Search, Sparkles, FileText, Folder } from "lucide-react";

export default function SearchBar({ projectId }) {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim() || query.trim().length < 2) {
      toast.error("Type at least 2 characters");
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const res = await api.get(`/projects/${projectId}/ai/search`, { params: { q: query } });
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

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            className="input pl-10 text-xs"
            placeholder="Ask in plain English e.g. 'where did we discuss auth retry logic'"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button className="btn btn-primary text-xs px-5 py-2.5 whitespace-nowrap" disabled={loading}>
          <Sparkles className="w-3.5 h-3.5" />
          <span>{loading ? "Searching..." : "AI Search"}</span>
        </button>
      </form>

      {searched && !loading && (
        <div className="space-y-4 animate-fadeIn">
          {answer && (
            <div className="card p-5 bg-indigo-500/10 border-indigo-500/30 space-y-2">
              <p className="text-[11px] uppercase font-bold tracking-wider text-indigo-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-400" /> AI Synthesized Answer
              </p>
              <p className="text-xs text-slate-200 dark:text-slate-200 light:text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
                {answer}
              </p>
            </div>
          )}

          {!answer && sources?.length === 0 ? (
            <div className="card p-8 text-center text-slate-400 text-xs">
              No matching knowledge base documents found for "{query}".
            </div>
          ) : (
            sources?.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Referenced Project Sources</p>
                {sources.map((source) => (
                  <div key={source.id} className="card p-4 space-y-2 hover:border-slate-700/80 transition-all">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="badge bg-slate-800 text-slate-300 border-slate-700 uppercase">{source.type}</span>
                      <h4 className="font-bold text-xs text-white dark:text-white light:text-slate-900">{source.title}</h4>
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-600 leading-relaxed">{source.snippet}...</p>
                    {source.sourceRef && <p className="text-[11px] text-indigo-400 italic">{source.sourceRef}</p>}
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}