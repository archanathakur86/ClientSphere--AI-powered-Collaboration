import nodemailer from "nodemailer";

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) return null;
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    // Fail fast instead of leaving the invite button spinning when the mail server is unreachable.
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
  transporter.from = SMTP_FROM || SMTP_USER;
  return transporter;
};

export const sendEmail = async ({ to, subject, html }) => {
  const mailer = getTransporter();
  if (!mailer) {
    console.log(`[Email preview] To: ${to} | Subject: ${subject}`);
    return { preview: true };
  }
  return mailer.sendMail({ from: mailer.from, to, subject, html });
};
