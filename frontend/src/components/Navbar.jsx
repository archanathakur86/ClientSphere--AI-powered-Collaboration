import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { Sparkles, LayoutDashboard, LogOut } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="bg-slate-950/85 border-b border-slate-800 backdrop-blur-xl sticky top-0 z-50 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2.5 text-lg">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-200 via-cyan-200 to-amber-100 flex items-center justify-center shadow-soft">
            <Sparkles className="w-4 h-4 text-indigo-800" />
          </div>
          <span className="font-semibold tracking-tight text-slate-100">ClientSphere</span>
        </Link>

        <div className="flex items-center gap-4">
          <Link
            to="/dashboard"
            className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-300 hover:text-slate-100 px-3 py-1.5 rounded-lg hover:bg-slate-900 transition-colors"
          >
            <LayoutDashboard className="w-4 h-4 text-indigo-400" />
            <span>Dashboard</span>
          </Link>

          <div className="h-4 w-px bg-slate-700 hidden sm:block" />

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-800 font-semibold text-xs">
                {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
              <span className="text-xs font-medium text-slate-300">{user?.name}</span>
            </div>

            <button
              onClick={() => {
                logout();
                navigate("/");
              }}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-rose-400 px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}