import React, { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Bot, Mic, Send, X, Maximize2, Minimize2, Plus, Trash2, Menu, Sparkles } from "lucide-react";

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

// Group chats like ChatGPT: Today / Yesterday / Previous 7 days / Older
const groupConversations = (list) => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const day = 24 * 60 * 60 * 1000;
  const groups = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Previous 7 days", items: [] },
    { label: "Older", items: [] },
  ];
  list.forEach((c) => {
    const t = new Date(c.updatedAt).getTime();
    if (t >= startOfToday.getTime()) groups[0].items.push(c);
    else if (t >= startOfToday.getTime() - day) groups[1].items.push(c);
    else if (t >= startOfToday.getTime() - 7 * day) groups[2].items.push(c);
    else groups[3].items.push(c);
  });
  return groups.filter((g) => g.items.length > 0);
};

export default function VoiceAssistant({ projectId = null }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile drawer
  const [conversations, setConversations] = useState([]); // sidebar history
  const [activeId, setActiveId] = useState(null); // null = brand new chat
  const [loadingChat, setLoadingChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [textInput, setTextInput] = useState("");
  const [status, setStatus] = useState("idle"); // idle | listening | thinking | speaking
  const [micSupported] = useState(!!SpeechRecognition);

  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  // Refs so async callbacks (voice results, API responses) always see the latest chat
  const activeIdRef = useRef(null);
  const sessionRef = useRef(0); // bumps every time the user switches chat / closes

  // ---------- helpers ----------
  const stopSpeaking = () => {
    if (synthRef.current) synthRef.current.cancel();
  };

  const loadConversations = async () => {
    try {
      const res = await api.get("/assistant/conversations");
      setConversations(res.data.conversations || []);
    } catch {
      // sidebar is non-critical; ignore
    }
  };

  const startNewChat = () => {
    sessionRef.current += 1;
    activeIdRef.current = null;
    setActiveId(null);
    setMessages([]);
    setTextInput("");
    setStatus("idle");
    setLoadingChat(false);
    setSidebarOpen(false);
    stopSpeaking();
  };

  const openConversation = async (id) => {
    if (id === activeIdRef.current) {
      setSidebarOpen(false);
      return;
    }
    sessionRef.current += 1;
    const mySession = sessionRef.current;
    activeIdRef.current = id;
    setActiveId(id);
    setMessages([]);
    setStatus("idle");
    setLoadingChat(true);
    setSidebarOpen(false);
    stopSpeaking();
    try {
      const res = await api.get(`/assistant/conversations/${id}`);
      if (sessionRef.current !== mySession) return; // user moved on
      setMessages(res.data.conversation.messages.map((m) => ({ role: m.role, content: m.content })));
    } catch {
      if (sessionRef.current !== mySession) return;
      toast.error("Couldn't load that conversation");
      startNewChat();
      loadConversations();
    } finally {
      if (sessionRef.current === mySession) setLoadingChat(false);
    }
  };

  const deleteConversation = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this conversation?")) return;
    try {
      await api.delete(`/assistant/conversations/${id}`);
      setConversations((prev) => prev.filter((c) => c._id !== id));
      if (activeIdRef.current === id) startNewChat();
      toast.success("Conversation deleted");
    } catch {
      toast.error("Failed to delete conversation");
    }
  };

  // ---------- open / close ----------
  useEffect(() => {
    if (open) {
      startNewChat();
      loadConversations();
    } else {
      sessionRef.current += 1; // ignore any reply still in flight
      stopSpeaking();
      try {
        recognitionRef.current?.abort();
      } catch {
        // ignore
      }
      setStatus("idle");
      setSidebarOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status, loadingChat]);

  // ---------- talking ----------
  const speak = (text) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onstart = () => setStatus("speaking");
    utterance.onend = () => setStatus("idle");
    utterance.onerror = () => setStatus("idle");
    synthRef.current.speak(utterance);
  };

  const sendMessage = async (message) => {
    if (!message.trim()) return;
    const mySession = sessionRef.current;
    const conversationId = activeIdRef.current;

    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setStatus("thinking");
    try {
      const res = await api.post("/assistant/chat", {
        message,
        ...(conversationId ? { conversationId } : {}),
        ...(projectId ? { projectId } : {}),
      });

      if (sessionRef.current === mySession) {
        activeIdRef.current = res.data.conversationId;
        setActiveId(res.data.conversationId);
        setMessages((prev) => [...prev, { role: "assistant", content: res.data.reply }]);
        speak(res.data.reply);
      }
      loadConversations();
    } catch (err) {
      const errMsg = err.response?.data?.message || "Sorry, I couldn't process that. Please try again.";
      if (sessionRef.current === mySession) {
        setMessages((prev) => [...prev, { role: "assistant", content: errMsg }]);
        setStatus("idle");
      }
      toast.error(errMsg);
    }
  };

  const handleTextSend = (e) => {
    e.preventDefault();
    const msg = textInput;
    setTextInput("");
    sendMessage(msg);
  };

  const startListening = () => {
    if (!micSupported) {
      toast.error("Voice input isn't supported in this browser. Try Chrome.");
      return;
    }
    if (status === "listening") {
      recognitionRef.current?.stop();
      return;
    }
    if (status === "thinking") return;

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setStatus("listening");
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      sendMessage(transcript);
    };
    recognition.onerror = (event) => {
      setStatus("idle");
      if (event.error === "not-allowed") {
        toast.error("Microphone permission denied. Please allow mic access.");
      } else if (event.error === "no-speech") {
        toast.error("No speech detected. Try again.");
      } else if (event.error !== "aborted") {
        toast.error("Voice recognition error. Please try again.");
      }
    };
    recognition.onend = () => {
      setStatus((s) => (s === "listening" ? "idle" : s));
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      toast.error("Could not start microphone. Please try again.");
    }
  };

  const statusLabel = {
    idle: "Tap mic or type to ask Sphere AI",
    listening: "🎙️ Listening...",
    thinking: "💭 Thinking...",
    speaking: "🔊 Speaking...",
  };

  const activeTitle = conversations.find((c) => c._id === activeId)?.title || "New chat";
  const grouped = groupConversations(conversations);

  // ---------- shared UI pieces ----------
  const renderMessages = (large) => (
    <>
      {loadingChat && <p className="text-xs text-slate-400 text-center mt-8">Loading conversation...</p>}
      {!loadingChat && messages.length === 0 && (
        <div className="text-center mt-8 space-y-2">
          <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center mx-auto">
            <Sparkles className="w-5 h-5" />
          </div>
          <p className="text-xs text-slate-400">
            Ask: "What's the status of my project milestones?" or "Summarize recent notes"
          </p>
        </div>
      )}
      {messages.map((m, i) => (
        <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
          <div
            className={`${large ? "max-w-[70%] px-4 py-2.5 text-sm" : "max-w-[85%] px-3 py-2 text-xs"} rounded-2xl whitespace-pre-wrap break-words ${
              m.role === "user"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 rounded-br-sm"
                : "bg-slate-900 dark:bg-slate-900 light:bg-slate-100 text-slate-100 dark:text-slate-100 light:text-slate-900 border border-slate-800 dark:border-slate-800 light:border-slate-200 rounded-bl-sm"
            }`}
          >
            {m.content}
          </div>
        </div>
      ))}
      {status === "thinking" && (
        <div className="flex justify-start">
          <div className={`bg-slate-900 text-slate-400 rounded-2xl italic text-xs ${large ? "px-4 py-2.5" : "px-3 py-2"}`}>
            Sphere is thinking...
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </>
  );

  const renderInput = (large) => (
    <>
      <button
        type="button"
        onClick={startListening}
        className={`${large ? "w-11 h-11 text-lg" : "w-9 h-9 text-base"} rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
          status === "listening" ? "bg-rose-500 text-white mic-listening" : "bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/30"
        }`}
        aria-label="Speak"
      >
        <Mic className="w-4 h-4" />
      </button>
      <input
        className={`input ${large ? "text-sm py-2.5" : "text-xs py-2"}`}
        placeholder="Type a message..."
        value={textInput}
        onChange={(e) => setTextInput(e.target.value)}
        disabled={status === "thinking" || loadingChat}
      />
      <button
        type="submit"
        className="btn btn-primary text-xs px-4 py-2 flex-shrink-0"
        disabled={status === "thinking" || loadingChat}
      >
        <Send className="w-3.5 h-3.5" />
      </button>
    </>
  );

  const renderSidebar = () => (
    <>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-400 text-white flex items-center justify-center font-bold text-xs">
          <Bot className="w-4 h-4" />
        </div>
        <span className="font-bold text-white text-sm">Sphere AI</span>
      </div>

      <button onClick={startNewChat} className="btn btn-primary text-xs w-full mb-4">
        <Plus className="w-4 h-4" /> New Conversation
      </button>

      <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-3">
        {grouped.length === 0 && <p className="text-xs text-slate-400 px-2 mt-2">Your past chats will appear here.</p>}
        {grouped.map((group) => (
          <div key={group.label} className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 mb-1">{group.label}</p>
            {group.items.map((c) => (
              <div key={c._id} className="group relative">
                <button
                  onClick={() => openConversation(c._id)}
                  title={c.title}
                  className={`w-full text-left truncate px-3 py-2 pr-8 rounded-xl text-xs transition-colors ${
                    c._id === activeId
                      ? "bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  {c.title}
                </button>
                <button
                  onClick={(e) => deleteConversation(c._id, e)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-400 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-1"
                  aria-label="Delete conversation"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="pt-3 border-t border-slate-800 mt-2">
        <p className="text-xs text-slate-400 mb-2 truncate">Hi {user?.name} 👋</p>
        <button onClick={() => setExpanded(false)} className="btn btn-secondary text-xs w-full">
          <Minimize2 className="w-3.5 h-3.5" /> Shrink Window
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 text-white shadow-xl shadow-indigo-600/30 flex items-center justify-center hover:scale-105 transition-all z-40"
        aria-label="Open AI assistant"
      >
        {open ? <X className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
      </button>

      {/* EXPANDED FULLSCREEN */}
      {open && expanded && (
        <div className="fixed inset-0 bg-slate-950/95 dark:bg-slate-950/95 light:bg-white z-50 flex animate-fadeIn">
          <div className="hidden sm:flex w-64 flex-shrink-0 bg-slate-900/90 border-r border-slate-800 flex-col p-4">
            {renderSidebar()}
          </div>

          {sidebarOpen && (
            <div className="sm:hidden fixed inset-0 z-50 flex">
              <div className="w-72 max-w-[80vw] bg-slate-900 flex flex-col p-4 shadow-2xl">{renderSidebar()}</div>
              <div className="flex-1 bg-black/50" onClick={() => setSidebarOpen(false)} />
            </div>
          )}

          <div className="flex-1 flex flex-col min-w-0">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between flex-shrink-0 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <button onClick={() => setSidebarOpen(true)} className="sm:hidden text-slate-400 hover:text-white" aria-label="Show chat history">
                  <Menu className="w-5 h-5" />
                </button>
                <p className="font-bold text-sm text-white truncate">{activeId ? activeTitle : "New chat"}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <button onClick={() => setExpanded(false)} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
                  <Minimize2 className="w-4 h-4" />
                </button>
                <button onClick={() => { setExpanded(false); setOpen(false); }} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="max-w-2xl mx-auto w-full px-4 py-8 space-y-4">{renderMessages(true)}</div>
            </div>

            <div className="text-[11px] text-center text-slate-500 py-1 flex-shrink-0">{statusLabel[status]}</div>

            <form onSubmit={handleTextSend} className="border-t border-slate-800 flex-shrink-0 px-6 py-4">
              <div className="max-w-2xl mx-auto w-full flex items-center gap-2">{renderInput(true)}</div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP WIDGET */}
      {open && !expanded && (
        <div className="fixed bottom-24 right-6 w-[90vw] max-w-sm h-[520px] bg-slate-900/95 dark:bg-slate-900/95 light:bg-white rounded-2xl shadow-2xl border border-slate-800/90 dark:border-slate-800/90 light:border-slate-200 flex flex-col z-40 backdrop-blur-xl animate-fadeIn">
          <div className="px-4 py-3.5 border-b border-slate-800/80 flex items-center justify-between flex-shrink-0 gap-2">
            <div className="min-w-0">
              <p className="font-bold text-xs text-white truncate">{activeId ? activeTitle : "Sphere Assistant"}</p>
              <p className="text-[11px] text-slate-400 truncate">Ask about deliverables or project health</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={startNewChat} className="p-1 text-slate-400 hover:text-white rounded" title="New chat">
                <Plus className="w-4 h-4" />
              </button>
              <button onClick={() => setExpanded(true)} className="p-1 text-slate-400 hover:text-white rounded" title="Expand window">
                <Maximize2 className="w-4 h-4" />
              </button>
              <button onClick={() => setOpen(false)} className="p-1 text-slate-400 hover:text-white rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">{renderMessages(false)}</div>

          <div className="px-4 py-1 text-[11px] text-center text-slate-400 flex-shrink-0 font-medium">{statusLabel[status]}</div>

          <form onSubmit={handleTextSend} className="p-3 border-t border-slate-800/80 flex items-center gap-2 flex-shrink-0">
            {renderInput(false)}
          </form>
        </div>
      )}
    </>
  );
}