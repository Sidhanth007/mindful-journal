/**
 * Transactional email via the Brevo REST API.
 *
 * If BREVO_API_KEY is not configured and we're in development, the message is
 * printed to the server console instead so the OTP flow can still be tested.
 */

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

type SendEmailInput = {
  to: { email: string; name?: string | null };
  subject: string;
  html: string;
  text: string;
};

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME ?? "Mindful Journal";

  if (!apiKey || !senderEmail) {
    if (process.env.NODE_ENV !== "production") {
      console.log(
        `\n[email:dev-fallback] Brevo not configured — email NOT sent.\n` +
          `  To:      ${input.to.email}\n` +
          `  Subject: ${input.subject}\n` +
          `  Body:    ${input.text.replace(/\n/g, "\n           ")}\n`,
      );
      return;
    }
    throw new Error("Email service is not configured (BREVO_API_KEY / BREVO_SENDER_EMAIL).");
  }

  const res = await fetch(BREVO_ENDPOINT, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: input.to.email, name: input.to.name ?? undefined }],
      subject: input.subject,
      htmlContent: input.html,
      textContent: input.text,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[email] Brevo error", res.status, body);
    throw new Error("Failed to send email. Please try again in a moment.");
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function otpTemplate(opts: { name?: string | null; code: string; purpose: string; minutes: number }) {
  const greeting = opts.name ? `Hi ${escapeHtml(opts.name)},` : "Hi,";
  const text =
    `${greeting}\n\nYour Mindful Journal ${opts.purpose} code is: ${opts.code}\n\n` +
    `It expires in ${opts.minutes} minutes. If you didn't request this, you can safely ignore this email.`;
  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0f172a">
    <h2 style="margin:0 0 16px;font-weight:600">Mindful Journal</h2>
    <p style="margin:0 0 12px">${greeting}</p>
    <p style="margin:0 0 12px">Your ${escapeHtml(opts.purpose)} code is:</p>
    <p style="font-size:32px;letter-spacing:8px;font-weight:700;margin:16px 0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace">${opts.code}</p>
    <p style="margin:0 0 12px;color:#64748b">It expires in ${opts.minutes} minutes. If you didn't request this, you can safely ignore this email.</p>
  </div>`;
  return { html, text };
}

export async function sendVerificationCode(to: { email: string; name?: string | null }, code: string, minutes: number) {
  const { html, text } = otpTemplate({ name: to.name, code, purpose: "email verification", minutes });
  await sendEmail({ to, subject: `${code} is your Mindful Journal verification code`, html, text });
}

export async function sendPasswordResetCode(to: { email: string; name?: string | null }, code: string, minutes: number) {
  const { html, text } = otpTemplate({ name: to.name, code, purpose: "password reset", minutes });
  await sendEmail({ to, subject: `${code} is your Mindful Journal password reset code`, html, text });
}
