const brand = "#6366f1";

const layout = ({ title, bodyHtml, ctaText, ctaUrl, footer = "" }) => `
  <div style="margin:0;padding:0;background:#0f172a;font-family:Inter,Arial,sans-serif;color:#e2e8f0;">
    <div style="max-width:640px;margin:0 auto;padding:32px 16px;">
      <div style="background:#111827;border:1px solid #1f2937;border-radius:20px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,.25);">
        <div style="padding:24px 28px;background:linear-gradient(135deg, #111827 0%, #0f172a 100%);border-bottom:1px solid #1f2937;">
          <div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:${brand};font-weight:700;">ClientSphere</div>
          <h1 style="margin:12px 0 0;font-size:24px;line-height:1.2;color:#fff;">${title}</h1>
        </div>
        <div style="padding:28px;line-height:1.7;font-size:15px;color:#cbd5e1;">${bodyHtml}</div>
        ${ctaUrl ? `<div style="padding:0 28px 28px;"><a href="${ctaUrl}" style="display:inline-block;background:${brand};color:white;text-decoration:none;padding:12px 20px;border-radius:12px;font-weight:700;">${ctaText || "Open"}</a></div>` : ""}
        ${footer ? `<div style="padding:0 28px 28px;font-size:12px;color:#64748b;">${footer}</div>` : ""}
      </div>
    </div>
  </div>
`;

export const inviteEmail = ({ projectName, magicLink, clientName = "there", freelancerName = "your freelancer" }) => ({
  subject: `You're invited to ${projectName}`,
  html: layout({
    title: `You're invited to ${projectName}`,
    bodyHtml: `<p>Hi ${clientName},</p><p>${freelancerName} invited you to review progress in ClientSphere. Use the secure magic link below to open your private client portal—no signup needed.</p><p style="word-break:break-all;color:#a5b4fc;">${magicLink}</p>`,
    ctaText: "Open client portal",
    ctaUrl: magicLink,
    footer: "This link expires automatically and can be revoked at any time.",
  }),
});

export const milestoneSubmittedEmail = ({ projectName, milestoneTitle, portalUrl }) => ({
  subject: `${projectName}: ${milestoneTitle} submitted for review`,
  html: layout({
    title: `${milestoneTitle} is ready for review`,
    bodyHtml: `<p>The milestone for <strong>${projectName}</strong> was submitted and is ready for your review.</p>`,
    ctaText: "Review milestone",
    ctaUrl: portalUrl,
  }),
});

export const milestoneDecisionEmail = ({ projectName, milestoneTitle, decision, portalUrl }) => ({
  subject: `${projectName}: ${milestoneTitle} ${decision}`,
  html: layout({
    title: `${milestoneTitle} ${decision}`,
    bodyHtml: `<p>The milestone for <strong>${projectName}</strong> was marked as <strong>${decision}</strong>.</p>`,
    ctaText: "Open project",
    ctaUrl: portalUrl,
  }),
});

export const weeklyUpdateEmail = ({ projectName, report, portalUrl }) => ({
  subject: `${projectName}: weekly update`,
  html: layout({
    title: `Weekly update for ${projectName}`,
    bodyHtml: `<div style="white-space:pre-wrap">${report}</div>`,
    ctaText: "Open project",
    ctaUrl: portalUrl,
  }),
});

export const invoiceEmail = ({ projectName, invoiceNumber, amount, pdfUrl, portalUrl, status = "draft" }) => ({
  subject: `${projectName}: invoice ${invoiceNumber || ""} ${status}`.trim(),
  html: layout({
    title: `Invoice ${invoiceNumber || ""} ${status}`.trim(),
    bodyHtml: `<p>An invoice for <strong>${projectName}</strong> is now ${status}.</p><p><strong>Total:</strong> $${Number(amount || 0).toFixed(2)}</p><p>${pdfUrl ? `PDF: <a href="${pdfUrl}" style="color:#a5b4fc;">download invoice</a>` : ""}</p>`,
    ctaText: "View portal",
    ctaUrl: portalUrl,
  }),
});
