import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

// Only the network layer is mocked; the real component, routing and storage are exercised.
vi.mock("../../api/axios.js", async () => {
  const actual = await vi.importActual("../../api/axios.js");
  return { ...actual, default: { get: vi.fn(), post: vi.fn() } };
});
vi.mock("../../hooks/useRealtime.js", () => ({
  useRealtime: () => ({ socket: null, notifications: [], unreadCount: 0, onlineUsers: [], markNotificationRead: vi.fn(), markAllRead: vi.fn() }),
}));
vi.mock("react-hot-toast", () => {
  const toast = Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() });
  return { default: toast };
});

import api from "../../api/axios.js";
import toast from "react-hot-toast";
import ClientPortal from "../ClientPortal.jsx";

const Where = () => <div data-testid="where">{useLocation().pathname}</div>;

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Where />
      <Routes>
        <Route path="/client/:projectId/:token" element={<ClientPortal />} />
        <Route path="/client/:projectId" element={<ClientPortal />} />
        <Route path="/login" element={<div>FREELANCER LOGIN</div>} />
      </Routes>
    </MemoryRouter>
  );

const milestone = (over) => ({ _id: "m1", title: "Logo design", description: "", amount: 500, status: "pending", changeRequests: [], ...over });
const portal = (over = {}) => ({
  clientAccessToken: "FRESH",
  project: { _id: "p1", name: "Acme Website", description: "", clientName: "Acme" },
  milestones: [],
  invoices: [],
  notes: [],
  comments: [],
  files: [],
  weeklyUpdate: "",
  progress: 0,
  ...over,
});

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  window.confirm = vi.fn(() => true);
});

describe("ClientPortal", () => {
  it("without a link or session, explains how to get in (no login redirect, no API call)", async () => {
    renderAt("/client/p1");
    expect(await screen.findByText(/Open the link from your invitation/i)).toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
    expect(screen.queryByText("FREELANCER LOGIN")).not.toBeInTheDocument();
  });

  it("exchanges the magic link, stores the session and removes the secret from the URL", async () => {
    api.get.mockImplementation(async (url) => {
      if (url === "/client/magic/p1/secret123") return { data: { clientAccessToken: "T1" } };
      if (url === "/client/projects/p1") return { data: portal() };
      throw new Error("unexpected " + url);
    });
    renderAt("/client/p1/secret123");
    expect(await screen.findByText("Acme Website")).toBeInTheDocument();
    expect(screen.getByTestId("where")).toHaveTextContent("/client/p1");
    expect(screen.getByTestId("where")).not.toHaveTextContent("secret123");
    expect(localStorage.getItem("portalToken")).toBe("FRESH"); // renewed by the portal call
    expect(localStorage.getItem("portalProjectId")).toBe("p1");
  });

  it("resumes from the stored session on refresh / plain email link, without the magic endpoint", async () => {
    localStorage.setItem("portalToken", "T1");
    localStorage.setItem("portalProjectId", "p1");
    api.get.mockResolvedValue({ data: portal() });
    renderAt("/client/p1");
    expect(await screen.findByText("Acme Website")).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith("/client/projects/p1");
  });

  it("does not use a session that belongs to a different project", async () => {
    localStorage.setItem("portalToken", "T1");
    localStorage.setItem("portalProjectId", "other-project");
    renderAt("/client/p1");
    expect(await screen.findByText(/Open the link from your invitation/i)).toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
  });

  it("shows a friendly 'expired' screen on 401 instead of the freelancer login", async () => {
    localStorage.setItem("portalToken", "T1");
    localStorage.setItem("portalProjectId", "p1");
    api.get.mockRejectedValue({ response: { status: 401, data: { message: "revoked" } } });
    renderAt("/client/p1");
    expect(await screen.findByText(/This access link has expired/i)).toBeInTheDocument();
    expect(screen.queryByText("FREELANCER LOGIN")).not.toBeInTheDocument();
  });

  it("shows Approve / Request changes only for milestones that are in review", async () => {
    localStorage.setItem("portalToken", "T1");
    localStorage.setItem("portalProjectId", "p1");
    api.get.mockResolvedValue({
      data: portal({
        milestones: [
          milestone({ _id: "a", title: "Upcoming one", status: "pending" }),
          milestone({ _id: "b", title: "Review one", status: "in review" }),
          milestone({ _id: "c", title: "Revising one", status: "changes requested" }),
          milestone({ _id: "d", title: "Done one", status: "approved", approvedAt: "2026-10-01" }),
        ],
      }),
    });
    renderAt("/client/p1");
    await screen.findByText("Review one");
    expect(screen.getAllByRole("button", { name: "Approve" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Request changes" })).toHaveLength(1);
    expect(screen.getByText(/1 milestone is waiting for your review/i)).toBeInTheDocument();
  });

  it("approve asks for confirmation, then calls the API (with no body)", async () => {
    localStorage.setItem("portalToken", "T1");
    localStorage.setItem("portalProjectId", "p1");
    api.get.mockResolvedValue({ data: portal({ milestones: [milestone({ status: "in review" })] }) });
    api.post.mockResolvedValue({ data: { success: true } });
    renderAt("/client/p1");
    fireEvent.click(await screen.findByRole("button", { name: "Approve" }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith("/client/projects/p1/milestones/m1/approve"));
    expect(window.confirm).toHaveBeenCalled();
  });

  it("approve does nothing if the client cancels the confirmation", async () => {
    localStorage.setItem("portalToken", "T1");
    localStorage.setItem("portalProjectId", "p1");
    window.confirm = vi.fn(() => false);
    api.get.mockResolvedValue({ data: portal({ milestones: [milestone({ status: "in review" })] }) });
    renderAt("/client/p1");
    fireEvent.click(await screen.findByRole("button", { name: "Approve" }));
    expect(api.post).not.toHaveBeenCalled();
  });

  it("request changes needs a message and sends it for that milestone only", async () => {
    localStorage.setItem("portalToken", "T1");
    localStorage.setItem("portalProjectId", "p1");
    api.get.mockResolvedValue({ data: portal({ milestones: [milestone({ status: "in review" })] }) });
    api.post.mockResolvedValue({ data: { success: true } });
    renderAt("/client/p1");

    fireEvent.click(await screen.findByRole("button", { name: "Request changes" }));
    fireEvent.click(screen.getByRole("button", { name: "Send change request" }));
    expect(toast.error).toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText("What should be changed?"), { target: { value: "Make the logo bigger" } });
    fireEvent.click(screen.getByRole("button", { name: "Send change request" }));
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/client/projects/p1/milestones/m1/request-changes", { comment: "Make the logo bigger" })
    );
  });

  it("shows the update only when there is one, and an empty state otherwise", async () => {
    localStorage.setItem("portalToken", "T1");
    localStorage.setItem("portalProjectId", "p1");
    api.get.mockResolvedValueOnce({ data: portal({ weeklyUpdate: "" }) });
    const first = renderAt("/client/p1");
    expect(await screen.findByText(/hasn't sent a progress update yet/i)).toBeInTheDocument();
    first.unmount();

    api.get.mockResolvedValueOnce({ data: portal({ weeklyUpdate: "Homepage is done.", weeklyUpdateSentAt: "2026-10-05" }) });
    renderAt("/client/p1");
    expect(await screen.findByText("Homepage is done.")).toBeInTheDocument();
  });

  it("Pay is offered for unpaid invoices only", async () => {
    localStorage.setItem("portalToken", "T1");
    localStorage.setItem("portalProjectId", "p1");
    api.get.mockResolvedValue({
      data: portal({
        invoices: [
          { _id: "i1", invoiceNumber: "INV-1", amount: 100, currency: "usd", status: "sent" },
          { _id: "i2", invoiceNumber: "INV-2", amount: 200, currency: "usd", status: "paid", paidAt: "2026-10-01" },
        ],
      }),
    });
    renderAt("/client/p1");
    await screen.findByText("INV-1");
    expect(screen.getAllByRole("button", { name: "Pay now" })).toHaveLength(1);
  });

  it("a sent comment appears right away, marked as the client's own", async () => {
    localStorage.setItem("portalToken", "T1");
    localStorage.setItem("portalProjectId", "p1");
    api.get.mockResolvedValue({ data: portal() });
    api.post.mockResolvedValue({ data: { comment: { _id: "c1", content: "Looks great", fromClient: true, authorName: "Acme", createdAt: "2026-10-06" } } });
    renderAt("/client/p1");
    fireEvent.change(await screen.findByPlaceholderText(/Write a message/i), { target: { value: "Looks great" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    expect(await screen.findByText("Looks great")).toBeInTheDocument();
    expect(screen.getByText("You")).toBeInTheDocument();
  });
});