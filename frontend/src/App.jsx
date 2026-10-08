import React from "react";
import { Routes, Route, Navigate, useLocation, matchPath } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";

import Navbar from "./components/Navbar.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import Onboarding from "./pages/Onboarding.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ProjectPage from "./pages/ProjectPage.jsx";
import PublicProject from "./pages/PublicProject.jsx";
import ClientPortal from "./pages/ClientPortal.jsx";
import VoiceAssistant from "./components/VoiceAssistant.jsx";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="p-10 text-center text-slate-500 bg-slate-950 min-h-screen flex items-center justify-center">
        Loading ClientSphere... Please wait while workspace loads.
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

export default function App() {
  const { user } = useAuth();
  const location = useLocation();
  const projectMatch = matchPath("/projects/:projectId", location.pathname);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {user && <Navbar />}
      <main className="flex-1">
        <Routes>
          {/* Public Landing Page */}
          <Route path="/" element={<LandingPage />} />

          {/* Auth Routes */}
          <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
          <Route path="/register" element={user ? <Navigate to="/onboarding" /> : <Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Public Client Portal */}
          <Route path="/public/:slug" element={<PublicProject />} />
          {/* Magic link (first visit) and the plain portal URL used by emails and Stripe returns */}
          <Route path="/client/:projectId/:token" element={<ClientPortal />} />
          <Route path="/client/:projectId" element={<ClientPortal />} />

          {/* Protected Routes */}
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId"
            element={
              <ProtectedRoute>
                <ProjectPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {user && <VoiceAssistant projectId={projectMatch?.params?.projectId || null} />}
    </div>
  );
}