import React, { useState } from "react";
import toast from "react-hot-toast";
import api from "../api/axios.js";

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
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          className="input"
          placeholder="Ask in plain English e.g. 'where did we discuss auth retry logic'"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="btn btn-primary whitespace-nowrap" disabled={loading}>
          {loading ? "Searching..." : "🔎 AI Search"}
        </button>
      </form>

      {searched && !loading && (
        <div className="space-y-2">
          {answer && (
            <div className="card bg-indigo-500/10 border-indigo-500/20">
              <p className="text-xs uppercase tracking-wide text-indigo-400 font-semibold mb-2">AI Answer</p>
              <p className="text-sm text-slate-300 whitespace-pre-wrap">{answer}</p>
            </div>
          )}

          {!answer && sources?.length === 0 ? (
            <p className="text-slate-400 text-sm">No relevant results found.</p>
          ) : (
            sources?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Sources</p>
                {sources.map((source) => (
                  <div key={source.id} className="card">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs bg-slate-800 px-2 py-0.5 rounded-full uppercase text-slate-400">{source.type}</span>
                      <h4 className="font-medium">{source.title}</h4>
                    </div>
                    <p className="text-sm text-slate-400 mt-1">{source.snippet}...</p>
                    {source.sourceRef && <p className="text-xs text-indigo-400 mt-2 italic">{source.sourceRef}</p>}
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