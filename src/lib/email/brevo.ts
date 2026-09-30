import "server-only";

interface TransactionalEmail {
  to: { email: string; name?: string };
  subject: string;
  textContent: string;
  htmlContent: string;
  tag: string;
}

export function isBrevoConfigured() {
  return Boolean(process.env.BREVO_API_KEY?.trim() && process.env.BREVO_SENDER_EMAIL?.trim());
}

export async function sendTransactionalEmail(message: TransactionalEmail) {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim();
  if (!apiKey || !senderEmail) throw new Error("Brevo email delivery is not configured");

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { accept: "application/json", "api-key": apiKey, "content-type": "application/json" },
    body: JSON.stringify({
      sender: { email: senderEmail, name: process.env.BREVO_SENDER_NAME?.trim() || "Elara" },
      to: [message.to],
      replyTo: process.env.BREVO_REPLY_TO_EMAIL?.trim() ? { email: process.env.BREVO_REPLY_TO_EMAIL.trim() } : undefined,
      subject: message.subject,
      textContent: message.textContent,
      htmlContent: message.htmlContent,
      tags: [message.tag],
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) throw new Error(`Brevo rejected the email request with status ${response.status}`);
}

export function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]!);
}
