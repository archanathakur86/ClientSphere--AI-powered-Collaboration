import dns from "node:dns/promises";
import nodemailer from "nodemailer";

let smtpTransporterPromise = null;

// Render has no IPv6 route, but Gmail's hostname also has IPv6 addresses that Node tries first.
// Look up Gmail's IPv4 address and connect to it directly. TLS still verifies the real hostname.
const createSmtpTransporter = async () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) return null;

  const [ipv4] = await dns.resolve4(SMTP_HOST);
  const transporter = nodemailer.createTransport({
    host: ipv4,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    tls: { servername: SMTP_HOST },
    // Slow hosts need more time than the defaults; still fail instead of spinning forever.
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 60000,
  });
  transporter.from = SMTP_FROM || SMTP_USER;
  return transporter;
};

const getSmtpTransporter = () => {
  if (!smtpTransporterPromise) {
    smtpTransporterPromise = createSmtpTransporter().catch((err) => {
      smtpTransporterPromise = null; // try again on the next email
      throw err;
    });
  }
  return smtpTransporterPromise;
};

// "ClientSphere <you@gmail.com>" -> { name, email }
const parseSender = (from = "") => {
  const match = String(from).match(/^(.*?)\s*<([^>]+)>$/);
  if (match) {
    return { name: match[1].replace(/"/g, "").trim() || "ClientSphere", email: match[2].trim() };
  }
  return { name: "ClientSphere", email: String(from).trim() };
};

// Preferred path: Brevo's HTTPS API. Hosts such as Render often block SMTP ports, but HTTPS always works.
const sendViaBrevo = async ({ to, subject, html }) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: parseSender(process.env.SMTP_FROM || process.env.SMTP_USER),
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`Brevo ${res.status}: ${await res.text()}`);
    }
    return { provider: "brevo" };
  } finally {
    clearTimeout(timer);
  }
};

export const emailConfigured = () =>
  Boolean(process.env.BREVO_API_KEY) ||
  Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS);

export const sendEmail = async ({ to, subject, html }) => {
  if (process.env.BREVO_API_KEY) return sendViaBrevo({ to, subject, html });

  const mailer = await getSmtpTransporter();
  if (!mailer) {
    console.log(`[Email preview] To: ${to} | Subject: ${subject}`);
    return { preview: true };
  }
  return mailer.sendMail({ from: mailer.from, to, subject, html });
};