import { Resend } from "resend";

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
})[character] ?? character);

const frontendURL = process.env.FRONTEND_URL ?? process.env.APP_URL ?? "http://localhost:3000";
const senderName = process.env.EMAIL_FROM_NAME ?? "Devpulse";
const configuredSender = process.env.EMAIL_FROM ?? "noreply@resend.dev";
const sender = configuredSender.includes("<")
  ? configuredSender
  : `${senderName} <${configuredSender}>`;
let resendClient: Resend | null = null;

function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set. Get one at resend.com and add it to .env");
  }
  if (!resendClient) resendClient = new Resend(apiKey);
  return resendClient;
}

async function sendEmail(options: Parameters<Resend["emails"]["send"]>[0]): Promise<void> {
  if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
    console.log(`[Email DEV] Skipping email to ${options.to}`);
    return;
  }

  const { data, error } = await getResend().emails.send(options);
  if (error) {
    console.error("[Email] Resend error:", error);
    throw new Error(`Resend error: ${error.name} — ${error.message}`);
  }
  console.log("[Email] Message sent", data?.id);
}

export async function sendMagicLink(email: string, token: string, name?: string): Promise<void> {
  const url = `${frontendURL}/auth/verify?token=${encodeURIComponent(token)}`;
  if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
    console.log(`[Email DEV] Magic link for ${email}:`);
    console.log(`  Token: ${token}`);
    console.log(`  URL: ${url}`);
    return;
  }

  try {
    await sendEmail({
      from: sender,
      to: [email],
      subject: "Your Devpulse sign-in link",
      html: buildMagicLinkHtml(url, name),
      text: buildMagicLinkText(url),
    });
  } catch (error) {
    console.error("[Email] sendMagicLink failed:", error);
    throw error;
  }
}

function buildMagicLinkHtml(url: string, name?: string): string {
  const safeUrl = escapeHtml(url);
  const greeting = name ? `Hey ${escapeHtml(name)},` : "Hi there,";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width">
  <title>Sign in to Devpulse</title>
</head>
<body style="margin:0;padding:0;background-color:#0A0A0F;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:40px auto;padding:0 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:#7C3AED;font-size:28px;font-weight:700;margin:0;">&#9889; Devpulse</h1>
    </div>
    <div style="background:#111118;border:1px solid #1f1f2e;border-radius:16px;padding:40px;">
      <h2 style="color:#e8e8f0;font-size:20px;font-weight:600;margin:0 0 12px;">
        ${greeting} here is your sign-in link
      </h2>
      <p style="color:#7a7a9a;font-size:15px;line-height:1.6;margin:0 0 28px;">
        Click below to sign in to Devpulse. This link expires in 15 minutes and works only once.
      </p>
      <div style="text-align:center;margin:0 0 28px;">
        <a href="${safeUrl}" style="display:inline-block;background:#7C3AED;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">
          Sign in to Devpulse &#8594;
        </a>
      </div>
      <div style="background:#0A0A0F;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
        <p style="color:#4a4a6a;font-size:12px;margin:0 0 4px;">Or copy this link:</p>
        <p style="color:#7C3AED;font-size:12px;word-break:break-all;margin:0;">${safeUrl}</p>
      </div>
      <p style="color:#4a4a6a;font-size:13px;margin:0;">
        If you did not request this, ignore this email safely.
      </p>
    </div>
    <p style="text-align:center;color:#4a4a6a;font-size:12px;margin-top:24px;">
      Devpulse · Code. Collaborate. Pulse.
    </p>
  </div>
</body>
</html>`;
}

function buildMagicLinkText(url: string): string {
  return [
    "Sign in to Devpulse",
    "",
    "Click this link to sign in:",
    url,
    "",
    "This link expires in 15 minutes.",
    "If you did not request this, ignore it.",
    "",
    "— The Devpulse Team",
  ].join("\n");
}

export async function sendWelcomeEmail(email: string, name: string): Promise<void> {
  const safeName = escapeHtml(name);
  await sendEmail({
    from: sender,
    to: [email],
    subject: "Welcome to Devpulse",
    html: `<div style="background:#0A0A0F;color:#e8e8f0;font-family:system-ui,sans-serif;padding:40px;max-width:560px;margin:0 auto"><h1 style="color:#7C3AED">Welcome, ${safeName}!</h1><p style="color:#7a7a9a">Your Devpulse account is ready. Code, collaborate, and ship faster.</p><a href="${frontendURL}/" style="display:inline-block;background:#7C3AED;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px">Open Devpulse</a></div>`,
    text: `Welcome, ${name}! Your Devpulse account is ready. ${frontendURL}/`,
  });
}

export async function sendNewDeviceAlert(email: string, name: string, ipAddress: string, userAgent: string): Promise<void> {
  const safeName = escapeHtml(name);
  const safeIp = escapeHtml(ipAddress);
  const safeAgent = escapeHtml(userAgent.slice(0, 60));
  await sendEmail({
    from: sender,
    to: [email],
    subject: "New sign-in to your Devpulse account",
    html: `<div style="background:#0A0A0F;color:#e8e8f0;font-family:system-ui,sans-serif;padding:40px;max-width:560px;margin:0 auto"><h2>New sign-in detected</h2><p style="color:#7a7a9a">Hi ${safeName}, your account was accessed from a new location.</p><div style="background:#18181f;padding:16px;border-radius:8px;margin:16px 0"><p style="margin:4px 0;color:#7a7a9a;font-size:13px">IP: ${safeIp}</p><p style="margin:4px 0;color:#7a7a9a;font-size:13px">Browser: ${safeAgent}</p><p style="margin:4px 0;color:#7a7a9a;font-size:13px">Time: ${new Date().toUTCString()}</p></div><p style="color:#7a7a9a;font-size:13px">If this was you, no action is needed. If not, secure your account.</p></div>`,
    text: `Hi ${name}, a sign-in to your Devpulse account was detected. IP: ${ipAddress}. Browser: ${userAgent.slice(0, 60)}. Time: ${new Date().toUTCString()}.`,
  });
}
