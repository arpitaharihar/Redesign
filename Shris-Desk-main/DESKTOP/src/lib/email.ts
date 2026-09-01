import nodemailer from "nodemailer";

type EmailPayload = {
  to: string;
  subject: string;
  body: string;
  html?: string;
};

export function getEmailConfig() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !port || !user || !pass || !from) {
    return null;
  }

  return { host, port, user, pass, from };
}

export async function sendEmail({ to, subject, body, html }: EmailPayload) {
  const config = getEmailConfig();
  if (!config) {
    throw new Error("Missing SMTP configuration.");
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  await transporter.sendMail({
    from: config.from,
    to,
    subject,
    text: body,
    html: html ?? undefined,
  });
}
