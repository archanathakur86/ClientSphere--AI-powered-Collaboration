import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import jwt from "jsonwebtoken";
import { jest } from "@jest/globals";
import bcrypt from "bcryptjs";

import User from "../models/User.js";
import Project from "../models/Project.js";
import Note from "../models/Note.js";
import FileItem from "../models/FileItem.js";
import Task from "../models/Task.js";
import Comment from "../models/Comment.js";
import ClientInvite from "../models/ClientInvite.js";
import Milestone from "../models/Milestone.js";
import Invoice from "../models/Invoice.js";

// ES modules: jest.mock() is not applied to static imports, so mock with
// unstable_mockModule and import the app dynamically afterwards.
jest.unstable_mockModule("../services/uploadService.js", () => ({
  uploadBufferToCloudinary: jest.fn().mockResolvedValue({ secure_url: "http://mock.url", public_id: "mock_id" }),
  deleteFromCloudinary: jest.fn().mockResolvedValue(true),
  fetchStoredFile: jest.fn().mockResolvedValue(Buffer.from("mock content")),
  contentTypeFor: jest.fn().mockReturnValue("text/plain"),
  isTextFile: jest.fn().mockReturnValue(true),
  getExtension: jest.fn().mockReturnValue("txt"),
}));

jest.unstable_mockModule("../services/groqService.js", () => ({
  generateTags: jest.fn().mockResolvedValue(["test"]),
  checkDuplicateNote: jest.fn().mockResolvedValue({ isDuplicate: false }),
  explainText: jest.fn().mockResolvedValue("mock explanation"),
  suggestImprovements: jest.fn().mockResolvedValue(["mock suggestion"]),
  explainCode: jest.fn().mockResolvedValue("mock code explanation"),
  reviewCodeDiff: jest.fn().mockResolvedValue({ summary: "mock review", riskLevel: "low", risks: [], suggestions: [] }),
  generateEmbedding: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
  detectScopeCreep: jest.fn().mockResolvedValue({ verdict: "out of scope", reason: "Adds new work", suggestedReply: "Happy to quote the extra work" }),
  answerWithSources: jest.fn().mockResolvedValue({ answer: "mock answer", sources: [] }),
  extractActionItems: jest.fn().mockResolvedValue([]),
  fastCompletion: jest.fn().mockResolvedValue("mock reply"),
  generateHealthReason: jest.fn().mockResolvedValue("mock reason"),
  generatePlainLanguageWeeklyUpdate: jest.fn().mockResolvedValue("mock weekly update"),
  generateReadme: jest.fn().mockResolvedValue("# mock readme"),
  generateWeeklyReport: jest.fn().mockResolvedValue("mock report"),
}));

const { app } = await import("../server.js");

let mongoServer;

beforeAll(async () => {
  // CI / restricted environments can point at any MongoDB-compatible server with
  // TEST_MONGO_URI; otherwise an in-memory MongoDB is started.
  let uri = process.env.TEST_MONGO_URI;
  if (!uri) {
    mongoServer = await MongoMemoryServer.create();
    uri = mongoServer.getUri();
  }
  await mongoose.disconnect();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  await User.deleteMany({});
  await Project.deleteMany({});
  await Note.deleteMany({});
  await FileItem.deleteMany({});
  await Task.deleteMany({});
  await Comment.deleteMany({});
  await ClientInvite.deleteMany({});
  await Milestone.deleteMany({});
  await Invoice.deleteMany({});
});

const getToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "1d" });
};

describe("Security & Authorization Tests", () => {
  it("1a. Non-member gets 404 on note PATCH and DELETE", async () => {
    const owner = await User.create({ name: "Owner", email: "owner@example.com", password: "password123" });
    const nonMember = await User.create({ name: "NonMember", email: "non@example.com", password: "password123" });
    const project = await Project.create({ name: "Proj 1", owner: owner._id, members: [] });
    const note = await Note.create({ project: project._id, author: owner._id, title: "Note 1", content: "Content" });

    const token = getToken(nonMember._id);

    const patchRes = await request(app)
      .patch(`/api/notes/${note._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Hacked Title" });
    expect(patchRes.status).toBe(404);

    const deleteRes = await request(app)
      .delete(`/api/notes/${note._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(deleteRes.status).toBe(404);
  });

  it("1b. Non-member gets 404 on file download and DELETE", async () => {
    const owner = await User.create({ name: "Owner", email: "owner2@example.com", password: "password123" });
    const nonMember = await User.create({ name: "NonMember", email: "non2@example.com", password: "password123" });
    const project = await Project.create({ name: "Proj 2", owner: owner._id, members: [] });
    const file = await FileItem.create({
      project: project._id,
      uploader: owner._id,
      originalName: "test.txt",
      url: "http://example.com/test.txt",
      publicId: "pid1",
      fileType: "txt",
    });

    const token = getToken(nonMember._id);

    const dlRes = await request(app)
      .get(`/api/files/${file._id}/download`)
      .set("Authorization", `Bearer ${token}`);
    expect(dlRes.status).toBe(404);

    const delRes = await request(app)
      .delete(`/api/files/${file._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(delRes.status).toBe(404);
  });

  it("1c. Non-member gets 404 on task PATCH and DELETE", async () => {
    const owner = await User.create({ name: "Owner", email: "owner3@example.com", password: "password123" });
    const nonMember = await User.create({ name: "NonMember", email: "non3@example.com", password: "password123" });
    const project = await Project.create({ name: "Proj 3", owner: owner._id, members: [] });
    const task = await Task.create({ project: project._id, title: "Task 1", status: "todo", priority: "medium" });

    const token = getToken(nonMember._id);

    const patchRes = await request(app)
      .patch(`/api/tasks/${task._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "done" });
    expect(patchRes.status).toBe(404);

    const delRes = await request(app)
      .delete(`/api/tasks/${task._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(delRes.status).toBe(404);
  });

  it("2. Viewer cannot edit or delete notes (returns 403)", async () => {
    const owner = await User.create({ name: "Owner", email: "owner4@example.com", password: "password123" });
    const viewer = await User.create({ name: "Viewer", email: "viewer@example.com", password: "password123" });
    const project = await Project.create({
      name: "Proj 4",
      owner: owner._id,
      members: [{ user: viewer._id, role: "viewer" }],
    });
    const note = await Note.create({ project: project._id, author: owner._id, title: "Note", content: "Body" });

    const token = getToken(viewer._id);

    const editRes = await request(app)
      .patch(`/api/notes/${note._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Viewer Edit" });
    expect(editRes.status).toBe(403);

    const delRes = await request(app)
      .delete(`/api/notes/${note._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(delRes.status).toBe(403);
  });

  it("3. Only comment author or owner can delete a comment", async () => {
    const owner = await User.create({ name: "Owner", email: "owner5@example.com", password: "password123" });
    const author = await User.create({ name: "Author", email: "author@example.com", password: "password123" });
    const otherMember = await User.create({ name: "Other", email: "other@example.com", password: "password123" });

    const project = await Project.create({
      name: "Proj 5",
      owner: owner._id,
      members: [
        { user: author._id, role: "editor" },
        { user: otherMember._id, role: "editor" },
      ],
    });

    const comment = await Comment.create({ project: project._id, author: author._id, content: "Nice work" });

    const otherToken = getToken(otherMember._id);
    const authorToken = getToken(author._id);
    const ownerToken = getToken(owner._id);

    // Other member forbidden
    const failRes = await request(app)
      .delete(`/api/comments/${comment._id}`)
      .set("Authorization", `Bearer ${otherToken}`);
    expect(failRes.status).toBe(403);

    // Author can delete
    const authorRes = await request(app)
      .delete(`/api/comments/${comment._id}`)
      .set("Authorization", `Bearer ${authorToken}`);
    expect(authorRes.status).toBe(200);

    // Recreate and test owner can delete
    const comment2 = await Comment.create({ project: project._id, author: author._id, content: "Another comment" });
    const ownerRes = await request(app)
      .delete(`/api/comments/${comment2._id}`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(ownerRes.status).toBe(200);
  });

  it("4. Invalid input returns 400 with a clear message", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Test",
      email: "not-an-email",
      password: "validpassword123",
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("Invalid email address");
  });

  it("5. Register with a short password fails (min 8 chars)", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Test User",
      email: "testshort@example.com",
      password: "short",
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("Password must be at least 8 characters");
  });

  describe("Client Portal Security", () => {
    it("6. Magic link client sees only shared notes from the matching project", async () => {
      const owner = await User.create({ name: "Owner", email: "owner6@example.com", password: "password123" });
      const projectA = await Project.create({ name: "Proj A", owner: owner._id, members: [] });
      const projectB = await Project.create({ name: "Proj B", owner: owner._id, members: [] });
      const ownerToken = getToken(owner._id);

      const inviteRes = await request(app)
        .post(`/api/projects/${projectA._id}/client-invite`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ email: "client@example.com", clientName: "Acme Client" });
      expect(inviteRes.status).toBe(200);

      const token = inviteRes.body.magicLink.split("/").pop();

      await Note.create({ project: projectA._id, author: owner._id, title: "Shared note", content: "visible", isShared: true });
      await Note.create({ project: projectA._id, author: owner._id, title: "Private note", content: "hidden", isShared: false });
      await Note.create({ project: projectB._id, author: owner._id, title: "Other project note", content: "should-not-be-visible", isShared: true });

      const clientRes = await request(app).get(`/api/client/magic/${projectA._id}/${token}`);
      expect(clientRes.status).toBe(200);
      expect(clientRes.body.notes.some((n) => n.title === "Shared note")).toBe(true);
      expect(clientRes.body.notes.some((n) => n.title === "Private note")).toBe(false);
      expect(clientRes.body.notes.some((n) => n.title === "Other project note")).toBe(false);

      const wrongProjectRes = await request(app).get(`/api/client/magic/${projectB._id}/${token}`);
      expect(wrongProjectRes.status).toBe(401);
    });

    it("7. Staff cannot approve or request changes; only the client can, and only while in review", async () => {
      const owner = await User.create({ name: "Owner", email: "owner7@example.com", password: "password123" });
      const project = await Project.create({ name: "Proj 7", owner: owner._id, members: [] });
      const ownerToken = getToken(owner._id);
      const auth = { Authorization: `Bearer ${ownerToken}` };

      const created = (
        await request(app)
          .post(`/api/projects/${project._id}/milestones`)
          .set(auth)
          .send({ title: "Phase 1", description: "Build UI", amount: 1000, dueDate: "2026-10-20" })
      ).body.milestone;
      const patch = (body) => request(app).patch(`/api/projects/${project._id}/milestones/${created._id}`).set(auth).send(body);

      // staff can't approve / request changes on the client's behalf
      expect((await patch({ status: "approved" })).status).toBe(403);
      expect((await patch({ status: "changes requested", comment: "x" })).status).toBe(403);

      // staff submit for review
      const submitted = await patch({ status: "in review" });
      expect(submitted.status).toBe(200);
      expect(submitted.body.milestone.status).toBe("in review");

      // details are locked while under review
      expect((await patch({ amount: 1 })).status).toBe(400);

      // client gets in through the magic link
      const invite = await request(app).post(`/api/projects/${project._id}/client-invite`).set(auth).send({ email: "client@example.com", clientName: "Acme" });
      expect(invite.status).toBe(200);
      expect(invite.body.clientAccessToken).toBeUndefined(); // no client credential leaks to the freelancer
      const rawToken = invite.body.magicLink.split("/").pop();
      const portal = await request(app).get(`/api/client/magic/${project._id}/${rawToken}`);
      expect(portal.status).toBe(200);
      const clientAuth = { Authorization: `Bearer ${portal.body.clientAccessToken}` };
      const base = `/api/client/projects/${project._id}/milestones/${created._id}`;

      // request-changes needs a comment
      expect((await request(app).post(`${base}/request-changes`).set(clientAuth).send({})).status).toBe(400);

      // approve: the client tries to rewrite the price and title in the same request
      const approve = await request(app).post(`${base}/approve`).set(clientAuth).send({ amount: 0, title: "hacked", status: "pending" });
      expect(approve.status).toBe(200);
      expect(approve.body.milestone.status).toBe("approved");
      expect(approve.body.milestone.amount).toBe(1000);
      expect(approve.body.milestone.title).toBe("Phase 1");

      const invoices = await Invoice.find({ project: project._id });
      expect(invoices).toHaveLength(1);
      expect(invoices[0].amount).toBe(1000);

      // approving again is a harmless no-op: still one invoice
      expect((await request(app).post(`${base}/approve`).set(clientAuth)).status).toBe(200);
      expect(await Invoice.countDocuments({ project: project._id })).toBe(1);

      // approved is final
      expect((await patch({ status: "pending" })).status).toBe(400);
    });

    it("8. Client cannot approve a milestone that was never submitted", async () => {
      const owner = await User.create({ name: "Owner", email: "owner8@example.com", password: "password123" });
      const project = await Project.create({ name: "Proj 8", owner: owner._id, members: [] });
      const auth = { Authorization: `Bearer ${getToken(owner._id)}` };
      const m = (await request(app).post(`/api/projects/${project._id}/milestones`).set(auth).send({ title: "Not ready", amount: 50 })).body.milestone;
      const invite = await request(app).post(`/api/projects/${project._id}/client-invite`).set(auth).send({ email: "c8@example.com" });
      const portal = await request(app).get(`/api/client/magic/${project._id}/${invite.body.magicLink.split("/").pop()}`);
      const clientAuth = { Authorization: `Bearer ${portal.body.clientAccessToken}` };

      const res = await request(app).post(`/api/client/projects/${project._id}/milestones/${m._id}/approve`).set(clientAuth);
      expect(res.status).toBe(400);
      const res2 = await request(app).post(`/api/client/projects/${project._id}/milestones/${m._id}/request-changes`).set(clientAuth).send({ comment: "hmm" });
      expect(res2.status).toBe(400);
    });

    it("9. Portal hides drafts: unsent weekly update, draft invoices, internal files/comments, AI fields", async () => {
      const owner = await User.create({ name: "Owner", email: "owner9@example.com", password: "password123" });
      const project = await Project.create({
        name: "Proj 9",
        owner: owner._id,
        members: [],
        weeklyUpdateDraft: { content: "SECRET DRAFT", generatedAt: new Date() },
      });
      const auth = { Authorization: `Bearer ${getToken(owner._id)}` };
      const ms = await Milestone.create({ project: project._id, title: "M", amount: 10, status: "approved" });
      await Invoice.create({ project: project._id, milestone: ms._id, clientEmail: "c9@example.com", amount: 10, status: "draft", invoiceNumber: "DRAFT-1" });
      await Invoice.create({ project: project._id, milestone: ms._id, clientEmail: "c9@example.com", amount: 10, status: "sent", invoiceNumber: "SENT-1" });
      await FileItem.create({ project: project._id, uploader: owner._id, originalName: "internal.txt", url: "http://x", textContent: "secret text", isShared: false });
      await FileItem.create({ project: project._id, uploader: owner._id, originalName: "shared.txt", url: "http://cloud/raw", textContent: "shared text", isShared: true, review: { summary: "AI says bad" } });
      await Comment.create({ project: project._id, author: owner._id, authorName: "Owner", content: "internal chat", isShared: false });
      await Comment.create({ project: project._id, author: owner._id, authorName: "Owner", content: "shared chat", isShared: true, scopeSuggestedReply: "PRIVATE REPLY" });

      const invite = await request(app).post(`/api/projects/${project._id}/client-invite`).set(auth).send({ email: "c9@example.com" });
      const res = await request(app).get(`/api/client/magic/${project._id}/${invite.body.magicLink.split("/").pop()}`);
      expect(res.status).toBe(200);

      const body = JSON.stringify(res.body);
      expect(res.body.weeklyUpdate).toBe("");
      expect(body).not.toContain("SECRET DRAFT");
      expect(res.body.invoices.map((i) => i.invoiceNumber)).toEqual(["SENT-1"]);
      expect(res.body.files.map((f) => f.originalName)).toEqual(["shared.txt"]);
      expect(res.body.comments.map((c) => c.content)).toEqual(["shared chat"]);
      for (const leaked of ["secret text", "shared text", "AI says bad", "PRIVATE REPLY", "http://cloud/raw", "embedding"]) {
        expect(body).not.toContain(leaked);
      }
      expect(res.body.project.owner).toBeUndefined();

      // after the freelancer sends it, the client sees exactly that text
      project.weeklyUpdateDraft.content = "Edited and sent";
      project.publishedUpdate = { content: "Edited and sent", sentAt: new Date() };
      await project.save();
      const after = await request(app).get(`/api/client/projects/${project._id}`).set({ Authorization: `Bearer ${res.body.clientAccessToken}` });
      expect(after.body.weeklyUpdate).toBe("Edited and sent");
    });

    it("10. Client cannot pay draft or paid invoices", async () => {
      const owner = await User.create({ name: "Owner", email: "owner10@example.com", password: "password123" });
      const project = await Project.create({ name: "Proj 10", owner: owner._id, members: [] });
      const auth = { Authorization: `Bearer ${getToken(owner._id)}` };
      const ms = await Milestone.create({ project: project._id, title: "M", amount: 10, status: "approved" });
      const draft = await Invoice.create({ project: project._id, milestone: ms._id, clientEmail: "c@x.com", amount: 10, status: "draft" });
      const paid = await Invoice.create({ project: project._id, milestone: ms._id, clientEmail: "c@x.com", amount: 10, status: "paid" });
      const invite = await request(app).post(`/api/projects/${project._id}/client-invite`).set(auth).send({ email: "c@x.com" });
      const portal = await request(app).get(`/api/client/magic/${project._id}/${invite.body.magicLink.split("/").pop()}`);
      const clientAuth = { Authorization: `Bearer ${portal.body.clientAccessToken}` };

      expect((await request(app).post(`/api/client/projects/${project._id}/invoices/${draft._id}/payment-session`).set(clientAuth)).status).toBe(404);
      expect((await request(app).get(`/api/client/projects/${project._id}/invoices/${draft._id}/pdf`).set(clientAuth)).status).toBe(404);
      expect((await request(app).post(`/api/client/projects/${project._id}/invoices/${paid._id}/payment-session`).set(clientAuth)).status).toBe(400);
    });

    it("11. Revoked invite kills the client token; client tokens are rejected on staff routes", async () => {
      const owner = await User.create({ name: "Owner", email: "owner11@example.com", password: "password123" });
      const project = await Project.create({ name: "Proj 11", owner: owner._id, members: [] });
      const auth = { Authorization: `Bearer ${getToken(owner._id)}` };
      const invite = await request(app).post(`/api/projects/${project._id}/client-invite`).set(auth).send({ email: "c11@example.com" });
      const portal = await request(app).get(`/api/client/magic/${project._id}/${invite.body.magicLink.split("/").pop()}`);
      const clientAuth = { Authorization: `Bearer ${portal.body.clientAccessToken}` };

      // works now
      expect((await request(app).get(`/api/client/projects/${project._id}`).set(clientAuth)).status).toBe(200);
      // but is not a staff credential
      expect((await request(app).get("/api/projects").set(clientAuth)).status).toBe(403);
      expect((await request(app).get("/api/auth/me").set(clientAuth)).status).toBe(403);
      expect((await request(app).get(`/api/projects/${project._id}`).set(clientAuth)).status).toBe(403);

      // owner revokes -> token stops working immediately
      const revoke = await request(app).patch(`/api/projects/${project._id}/client-invite/${invite.body.invite._id}/revoke`).set(auth);
      expect(revoke.status).toBe(200);
      expect((await request(app).get(`/api/client/projects/${project._id}`).set(clientAuth)).status).toBe(401);
      expect((await request(app).get("/api/notifications").set(clientAuth)).status).toBe(401);
    });

    it("12. Public page shows only shared notes; viewer cannot edit the project or see invoices", async () => {
      const owner = await User.create({ name: "Owner", email: "owner12@example.com", password: "password123" });
      const viewer = await User.create({ name: "Viewer", email: "viewer12@example.com", password: "password123" });
      const project = await Project.create({ name: "Proj 12", owner: owner._id, members: [{ user: viewer._id, role: "viewer" }], isPublic: true });
      await Note.create({ project: project._id, author: owner._id, title: "Public one", content: "ok", isShared: true });
      await Note.create({ project: project._id, author: owner._id, title: "Internal one", content: "no", isShared: false });

      const pub = await request(app).get(`/api/public/${project.publicSlug}`);
      expect(pub.status).toBe(200);
      expect(pub.body.notes.map((n) => n.title)).toEqual(["Public one"]);

      const vAuth = { Authorization: `Bearer ${getToken(viewer._id)}` };
      expect((await request(app).patch(`/api/projects/${project._id}`).set(vAuth).send({ name: "pwned" })).status).toBe(403);
      expect((await request(app).get(`/api/projects/${project._id}/invoices`).set(vAuth)).status).toBe(403);
      expect((await request(app).get(`/api/invoices/project/${project._id}`).set(vAuth)).status).toBe(403);

      const oAuth = { Authorization: `Bearer ${getToken(owner._id)}` };
      expect((await request(app).get(`/api/invoices/project/${project._id}`).set(oAuth)).status).toBe(200);
      expect((await request(app).post(`/api/projects/${project._id}/members`).set(oAuth).send({ email: viewer.email, role: "owner" })).status).toBe(400);
    });

    it("13. Client comment is visible to the client, never carries scope-creep data back, and owner can delete it", async () => {
      const owner = await User.create({ name: "Owner", email: "owner13@example.com", password: "password123" });
      const project = await Project.create({ name: "Proj 13", owner: owner._id, members: [] });
      const auth = { Authorization: `Bearer ${getToken(owner._id)}` };
      const invite = await request(app).post(`/api/projects/${project._id}/client-invite`).set(auth).send({ email: "c13@example.com" });
      const portal = await request(app).get(`/api/client/magic/${project._id}/${invite.body.magicLink.split("/").pop()}`);
      const clientAuth = { Authorization: `Bearer ${portal.body.clientAccessToken}` };

      const posted = await request(app).post(`/api/client/projects/${project._id}/comments`).set(clientAuth).send({ content: "Can you also add a blog?" });
      expect(posted.status).toBe(201);
      expect(posted.body.comment.scopeSuggestedReply).toBeUndefined();
      expect(posted.body.comment.scopeVerdict).toBeUndefined();

      const again = await request(app).get(`/api/client/projects/${project._id}`).set(clientAuth);
      expect(again.body.comments.map((c) => c.content)).toContain("Can you also add a blog?");

      // staff list still carries the freelancer-only verdict fields
      const staff = await request(app).get(`/api/projects/${project._id}/comments`).set(auth);
      expect(staff.body.comments[0]).toHaveProperty("scopeVerdict");

      // deleting a client comment (author = null) must not crash
      const del = await request(app).delete(`/api/comments/${posted.body.comment._id}`).set(auth);
      expect(del.status).toBe(200);
    });

    it("14. Magic link can be opened repeatedly, and several clients can share one project", async () => {
      const owner = await User.create({ name: "Owner", email: "owner14@example.com", password: "password123" });
      const project = await Project.create({ name: "Proj 14", owner: owner._id, members: [] });
      const auth = { Authorization: `Bearer ${getToken(owner._id)}` };
      const inviteA = await request(app).post(`/api/projects/${project._id}/client-invite`).set(auth).send({ email: "a14@example.com" });
      const inviteB = await request(app).post(`/api/projects/${project._id}/client-invite`).set(auth).send({ email: "b14@example.com" });
      expect(inviteA.body.emailSent).toBe(false); // no SMTP in tests; the link is still returned
      const tokenA = inviteA.body.magicLink.split("/").pop();
      const tokenB = inviteB.body.magicLink.split("/").pop();
      const open = (token) => request(app).get(`/api/client/magic/${project._id}/${token}`);

      // refresh / second device / email preview must not "use up" the link
      expect((await open(tokenA)).status).toBe(200);
      expect((await open(tokenA)).status).toBe(200);
      // inviting a second client must not kill the first client's link
      expect((await open(tokenB)).status).toBe(200);
      expect((await open(tokenA)).status).toBe(200);

      expect((await open("not-the-token")).status).toBe(401);
      expect((await request(app).get("/api/client/magic/not-an-id/abc")).status).toBe(401);
      expect((await ClientInvite.findOne({ email: "a14@example.com" })).usedAt).toBeTruthy();
    });

    it("15. Portal visit renews the session; revoking one client leaves the other working", async () => {
      const owner = await User.create({ name: "Owner", email: "owner15@example.com", password: "password123" });
      const project = await Project.create({ name: "Proj 15", owner: owner._id, members: [] });
      const auth = { Authorization: `Bearer ${getToken(owner._id)}` };
      const a = await request(app).post(`/api/projects/${project._id}/client-invite`).set(auth).send({ email: "a15@example.com" });
      const b = await request(app).post(`/api/projects/${project._id}/client-invite`).set(auth).send({ email: "b15@example.com" });
      const sessA = (await request(app).get(`/api/client/magic/${project._id}/${a.body.magicLink.split("/").pop()}`)).body.clientAccessToken;
      const sessB = (await request(app).get(`/api/client/magic/${project._id}/${b.body.magicLink.split("/").pop()}`)).body.clientAccessToken;

      // visiting with a stored session returns a fresh, working token
      const renewed = await request(app).get(`/api/client/projects/${project._id}`).set({ Authorization: `Bearer ${sessA}` });
      expect(renewed.status).toBe(200);
      expect(renewed.body.clientAccessToken).toBeTruthy();
      expect((await request(app).get(`/api/client/projects/${project._id}`).set({ Authorization: `Bearer ${renewed.body.clientAccessToken}` })).status).toBe(200);

      await request(app).patch(`/api/projects/${project._id}/client-invite/${a.body.invite._id}/revoke`).set(auth);
      expect((await request(app).get(`/api/client/projects/${project._id}`).set({ Authorization: `Bearer ${sessA}` })).status).toBe(401);
      expect((await request(app).get(`/api/client/projects/${project._id}`).set({ Authorization: `Bearer ${renewed.body.clientAccessToken}` })).status).toBe(401);
      expect((await request(app).get(`/api/client/projects/${project._id}`).set({ Authorization: `Bearer ${sessB}` })).status).toBe(200);
    });

    it("16. Client can open shared files of their own project only", async () => {
      const owner = await User.create({ name: "Owner", email: "owner16@example.com", password: "password123" });
      const project = await Project.create({ name: "Proj 16", owner: owner._id, members: [] });
      const other = await Project.create({ name: "Other 16", owner: owner._id, members: [] });
      const auth = { Authorization: `Bearer ${getToken(owner._id)}` };
      const shared = await FileItem.create({ project: project._id, uploader: owner._id, originalName: "shared.txt", url: "http://x", fileType: "txt", isShared: true });
      const internal = await FileItem.create({ project: project._id, uploader: owner._id, originalName: "internal.txt", url: "http://x", fileType: "txt", isShared: false });
      const foreign = await FileItem.create({ project: other._id, uploader: owner._id, originalName: "foreign.txt", url: "http://x", fileType: "txt", isShared: true });
      const invite = await request(app).post(`/api/projects/${project._id}/client-invite`).set(auth).send({ email: "c16@example.com" });
      const sess = (await request(app).get(`/api/client/magic/${project._id}/${invite.body.magicLink.split("/").pop()}`)).body.clientAccessToken;
      const clientAuth = { Authorization: `Bearer ${sess}` };
      const url = (id) => `/api/client/projects/${project._id}/files/${id}/download`;

      const ok = await request(app).get(url(shared._id)).set(clientAuth);
      expect(ok.status).toBe(200);
      expect(ok.headers["x-content-type-options"]).toBe("nosniff");
      expect((await request(app).get(url(internal._id)).set(clientAuth)).status).toBe(404);
      expect((await request(app).get(url(foreign._id)).set(clientAuth)).status).toBe(404);
      expect((await request(app).get(url(shared._id))).status).toBe(401);
    });

    it("17. Expired invites stop working (link and existing session)", async () => {
      const owner = await User.create({ name: "Owner", email: "owner17@example.com", password: "password123" });
      const project = await Project.create({ name: "Proj 17", owner: owner._id, members: [] });
      const auth = { Authorization: `Bearer ${getToken(owner._id)}` };
      const invite = await request(app).post(`/api/projects/${project._id}/client-invite`).set(auth).send({ email: "c17@example.com" });
      const rawToken = invite.body.magicLink.split("/").pop();
      const sess = (await request(app).get(`/api/client/magic/${project._id}/${rawToken}`)).body.clientAccessToken;

      await ClientInvite.updateOne({ _id: invite.body.invite._id }, { expiresAt: new Date(Date.now() - 1000) });
      expect((await request(app).get(`/api/client/magic/${project._id}/${rawToken}`)).status).toBe(401);
      expect((await request(app).get(`/api/client/projects/${project._id}`).set({ Authorization: `Bearer ${sess}` })).status).toBe(401);

      // re-inviting the same email gives a fresh working link
      const again = await request(app).post(`/api/projects/${project._id}/client-invite`).set(auth).send({ email: "c17@example.com" });
      expect((await request(app).get(`/api/client/magic/${project._id}/${again.body.magicLink.split("/").pop()}`)).status).toBe(200);
    });

  describe("Freelancer workspace (Batch 3)", () => {
    const makeOwner = async (n) => {
      const owner = await User.create({ name: `Owner${n}`, email: `owner-b3-${n}@example.com`, password: "password123" });
      return { owner, auth: { Authorization: `Bearer ${getToken(owner._id)}` } };
    };
    const daysFromNow = (d) => new Date(Date.now() + d * 24 * 60 * 60 * 1000);

    it("18. Project stores client name/email; a bad client email is rejected", async () => {
      const { auth } = await makeOwner(18);
      const ok = await request(app).post("/api/projects").set(auth).send({ name: "P18", clientName: "Acme", clientEmail: "Client@Acme.com " });
      expect(ok.status).toBe(201);
      expect(ok.body.project.clientName).toBe("Acme");
      expect(ok.body.project.clientEmail).toBe("client@acme.com");

      const bad = await request(app).post("/api/projects").set(auth).send({ name: "P18b", clientEmail: "not-an-email" });
      expect(bad.status).toBe(400);

      const none = await request(app).post("/api/projects").set(auth).send({ name: "P18c", clientEmail: "" });
      expect(none.status).toBe(201);
    });

    it("19. Dashboard summary reports real numbers (not placeholders) and hides money from viewers", async () => {
      const { owner, auth } = await makeOwner(19);
      const viewer = await User.create({ name: "Viewer", email: "viewer-b3-19@example.com", password: "password123" });
      const project = await Project.create({ name: "Real Numbers", owner: owner._id, clientName: "Acme", members: [{ user: viewer._id, role: "viewer" }] });

      await Milestone.create({ project: project._id, title: "Review soon", status: "in review", dueDate: daysFromNow(5), amount: 100 });
      await Milestone.create({ project: project._id, title: "Later", status: "pending", dueDate: daysFromNow(20), amount: 100 });
      await Milestone.create({ project: project._id, title: "Late one", status: "pending", dueDate: daysFromNow(-3), amount: 100 });
      await Milestone.create({ project: project._id, title: "Done", status: "approved", dueDate: daysFromNow(-10), amount: 100 });
      const ms = await Milestone.findOne({ title: "Done" });
      await Invoice.create({ project: project._id, milestone: ms._id, clientEmail: "c@x.com", amount: 10, status: "overdue" });
      await Invoice.create({ project: project._id, milestone: ms._id, clientEmail: "c@x.com", amount: 10, status: "sent" });
      await Invoice.create({ project: project._id, milestone: ms._id, clientEmail: "c@x.com", amount: 10, status: "draft" });
      await Invoice.create({ project: project._id, milestone: ms._id, clientEmail: "c@x.com", amount: 10, status: "paid" });
      const recent = await Comment.create({ project: project._id, author: null, authorName: "Client", content: "extra please", isShared: true, scopeVerdict: "out of scope" });
      await Comment.create({ project: project._id, author: null, authorName: "Client", content: "fine", isShared: true, scopeVerdict: "in scope" });
      const old = await Comment.create({ project: project._id, author: null, authorName: "Client", content: "old ask", isShared: true, scopeVerdict: "out of scope" });
      await Comment.collection.updateOne({ _id: old._id }, { $set: { createdAt: daysFromNow(-40) } });
      expect(recent).toBeTruthy();

      const res = await request(app).get("/api/projects").set(auth);
      expect(res.status).toBe(200);
      expect(res.body.summary).toEqual({ activeProjects: 1, pendingApprovals: 1, overdueInvoices: 1, overdueMilestones: 1, scopeAlerts: 1 });
      const card = res.body.projects[0];
      expect(card.summary.milestonesTotal).toBe(4);
      expect(card.summary.milestonesApproved).toBe(1);
      expect(card.summary.unpaidInvoices).toBe(2); // sent + overdue; drafts and paid are not "unpaid"
      expect(card.summary.nextDeadline.title).toBe("Review soon"); // the nearest FUTURE open milestone
      expect(card.activityLog).toBeUndefined(); // list payload stays light

      // a viewer sees milestone progress but never invoice or scope data
      const vRes = await request(app).get("/api/projects").set({ Authorization: `Bearer ${getToken(viewer._id)}` });
      expect(vRes.body.projects[0].summary.pendingApprovals).toBe(1);
      expect(vRes.body.summary.overdueInvoices).toBe(0);
      expect(vRes.body.summary.scopeAlerts).toBe(0);
    });

    it("20. Owner can list client invites (no secrets); status follows the link's life; others cannot", async () => {
      const { owner, auth } = await makeOwner(20);
      const editor = await User.create({ name: "Editor", email: "editor-b3-20@example.com", password: "password123" });
      const stranger = await User.create({ name: "Stranger", email: "stranger-b3-20@example.com", password: "password123" });
      const project = await Project.create({ name: "P20", owner: owner._id, members: [{ user: editor._id, role: "editor" }] });
      const invite = await request(app).post(`/api/projects/${project._id}/client-invite`).set(auth).send({ email: "c20@example.com" });
      const list = () => request(app).get(`/api/projects/${project._id}/client-invites`).set(auth);

      let res = await list();
      expect(res.status).toBe(200);
      expect(res.body.invites).toHaveLength(1);
      expect(res.body.invites[0].status).toBe("invited");
      expect(JSON.stringify(res.body)).not.toContain("tokenHash");

      await request(app).get(`/api/client/magic/${project._id}/${invite.body.magicLink.split("/").pop()}`);
      expect((await list()).body.invites[0].status).toBe("active");

      await request(app).patch(`/api/projects/${project._id}/client-invite/${invite.body.invite._id}/revoke`).set(auth);
      expect((await list()).body.invites[0].status).toBe("revoked");

      expect((await request(app).get(`/api/projects/${project._id}/client-invites`).set({ Authorization: `Bearer ${getToken(editor._id)}` })).status).toBe(403);
      // a non-member is refused as well (loadProject answers 403 for non-members)
      expect((await request(app).get(`/api/projects/${project._id}/client-invites`).set({ Authorization: `Bearer ${getToken(stranger._id)}` })).status).toBe(403);
    });

    it("21. Milestones can be deleted only before the client acts; approved and in-review ones are protected", async () => {
      const { owner, auth } = await makeOwner(21);
      const viewer = await User.create({ name: "Viewer", email: "viewer-b3-21@example.com", password: "password123" });
      const project = await Project.create({ name: "P21", owner: owner._id, members: [{ user: viewer._id, role: "viewer" }] });
      const other = await Project.create({ name: "Other21", owner: owner._id, members: [] });
      const mk = (status, proj = project) => Milestone.create({ project: proj._id, title: `M-${status}`, status, amount: 5 });
      const pending = await mk("pending");
      const review = await mk("in review");
      const approved = await mk("approved");
      const foreign = await mk("pending", other);
      const del = (m, headers = auth) => request(app).delete(`/api/projects/${project._id}/milestones/${m._id}`).set(headers);

      expect((await del(review)).status).toBe(400);
      expect((await del(approved)).status).toBe(400);
      expect((await del(foreign)).status).toBe(404); // another project's milestone
      expect((await del(pending, { Authorization: `Bearer ${getToken(viewer._id)}` })).status).toBe(403);
      expect((await del(pending)).status).toBe(200);
      expect(await Milestone.countDocuments({ project: project._id })).toBe(2);
    });

    it("22. Staff can publish a comment to the client; viewers cannot; shared comments notify the client, internal ones never do", async () => {
      const { owner, auth } = await makeOwner(22);
      const viewer = await User.create({ name: "Viewer", email: "viewer-b3-22@example.com", password: "password123" });
      const project = await Project.create({ name: "P22", owner: owner._id, members: [{ user: viewer._id, role: "viewer" }] });
      const post = (headers, body) => request(app).post(`/api/projects/${project._id}/comments`).set(headers).send(body);
      const vAuth = { Authorization: `Bearer ${getToken(viewer._id)}` };

      const shared = await post(auth, { content: "Update for you", isShared: true });
      const internal = await post(auth, { content: "INTERNAL ONLY" });
      const sneaky = await post(vAuth, { content: "viewer tries to publish", isShared: true });
      expect(shared.body.comment.isShared).toBe(true);
      expect(internal.body.comment.isShared).toBe(false);
      expect(sneaky.body.comment.isShared).toBe(false);

      const invite = await request(app).post(`/api/projects/${project._id}/client-invite`).set(auth).send({ email: "c22@example.com" });
      const portal = await request(app).get(`/api/client/magic/${project._id}/${invite.body.magicLink.split("/").pop()}`);
      expect(portal.body.comments.map((c) => c.content)).toEqual(["Update for you"]);

      const Notification = (await import("../models/Notification.js")).default;
      const toClient = await Notification.find({ recipientKey: `client:${project._id}` });
      expect(toClient.map((n) => n.message)).toEqual(["Update for you"]);
    });

    it("23. A client request is checked against the real milestones, and the verdict reaches the freelancer only", async () => {
      const { owner, auth } = await makeOwner(23);
      const project = await Project.create({ name: "P23", owner: owner._id, members: [] });
      await Milestone.create({ project: project._id, title: "Logo design", description: "Three logo concepts", amount: 10, status: "pending" });
      const invite = await request(app).post(`/api/projects/${project._id}/client-invite`).set(auth).send({ email: "c23@example.com" });
      const portal = await request(app).get(`/api/client/magic/${project._id}/${invite.body.magicLink.split("/").pop()}`);
      const clientAuth = { Authorization: `Bearer ${portal.body.clientAccessToken}` };

      const groq = await import("../services/groqService.js");
      groq.detectScopeCreep.mockClear();
      await request(app).post(`/api/client/projects/${project._id}/comments`).set(clientAuth).send({ content: "Please also build an online shop" });

      const callArg = groq.detectScopeCreep.mock.calls[0][0];
      expect(callArg.milestoneDescriptions.join(" ")).toContain("Logo design");

      const staff = await request(app).get(`/api/projects/${project._id}/comments`).set(auth);
      const c = staff.body.comments[0];
      expect(c.scopeVerdict).toBe("out of scope");
      expect(c.scopeSuggestedReply).toBeTruthy();

      const clientView = await request(app).get(`/api/client/projects/${project._id}`).set(clientAuth);
      expect(JSON.stringify(clientView.body)).not.toMatch(/scope/i);
    });
  });
  });
});