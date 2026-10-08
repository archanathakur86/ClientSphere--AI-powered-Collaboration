import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  timeout: 60000,
});

// Two kinds of session live in the same browser:
//  - "token"       : the freelancer / team member login
//  - "portalToken" : a client's magic-link session (only valid on /client/* pages)
export const isPortalPage = () => window.location.pathname.startsWith("/client/");
export const PORTAL_SESSION_EXPIRED = "portal-session-expired";

export const clearPortalSession = () => {
  localStorage.removeItem("portalToken");
  localStorage.removeItem("portalProjectId");
};

export const getActiveToken = () =>
  isPortalPage() ? localStorage.getItem("portalToken") : localStorage.getItem("token");

api.interceptors.request.use((config) => {
  const token = getActiveToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      if (isPortalPage()) {
        // Clients have no login page. Tell the portal so it can show "link expired"
        // instead of throwing them onto the freelancer login screen.
        const isMagicExchange = String(err.config?.url || "").includes("/client/magic/");
        if (!isMagicExchange) {
          clearPortalSession();
          window.dispatchEvent(new Event(PORTAL_SESSION_EXPIRED));
        }
      } else if (localStorage.getItem("token")) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        if (window.location.pathname !== "/login") window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export default api;