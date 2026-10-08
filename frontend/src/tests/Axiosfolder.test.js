import { describe, it, expect, beforeEach, vi } from "vitest";
import api, { PORTAL_SESSION_EXPIRED } from "../axios.js";

const requestHandler = () => api.interceptors.request.handlers[0].fulfilled;
const errorHandler = () => api.interceptors.response.handlers[0].rejected;
const goTo = (path) => window.history.pushState({}, "", path);

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("token", "STAFF");
  localStorage.setItem("portalToken", "CLIENT");
  localStorage.setItem("portalProjectId", "p1");
});

describe("axios session separation", () => {
  it("uses the staff token on app pages, even if a client portal session is stored", () => {
    goTo("/dashboard");
    expect(requestHandler()({ headers: {} }).headers.Authorization).toBe("Bearer STAFF");
  });

  it("uses the client token on portal pages, even if a staff login is stored", () => {
    goTo("/client/p1");
    expect(requestHandler()({ headers: {} }).headers.Authorization).toBe("Bearer CLIENT");
  });

  it("sends no Authorization header when the relevant session is missing", () => {
    goTo("/client/p1");
    localStorage.removeItem("portalToken");
    expect(requestHandler()({ headers: {} }).headers.Authorization).toBeUndefined();
  });

  it("a 401 on the portal ends only the client session and notifies the page (no login redirect)", async () => {
    goTo("/client/p1");
    const onExpired = vi.fn();
    window.addEventListener(PORTAL_SESSION_EXPIRED, onExpired);
    await expect(errorHandler()({ response: { status: 401 }, config: { url: "/client/projects/p1" } })).rejects.toBeTruthy();
    expect(localStorage.getItem("portalToken")).toBeNull();
    expect(localStorage.getItem("token")).toBe("STAFF"); // freelancer login untouched
    expect(window.location.pathname).toBe("/client/p1");
    expect(onExpired).toHaveBeenCalledTimes(1);
    window.removeEventListener(PORTAL_SESSION_EXPIRED, onExpired);
  });

  it("a bad magic link does not wipe a still-valid stored client session", async () => {
    goTo("/client/p1/oldtoken");
    await expect(errorHandler()({ response: { status: 401 }, config: { url: "/client/magic/p1/oldtoken" } })).rejects.toBeTruthy();
    expect(localStorage.getItem("portalToken")).toBe("CLIENT");
  });
});