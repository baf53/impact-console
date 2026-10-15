/**
 * Transactional email through Resend (https://resend.com). Configured with
 * RESEND_API_KEY and ALERT_FROM_EMAIL (an address on a domain verified in Resend).
 * Optional ALERT_REPLY_TO sends client replies to the operator's inbox.
 */

export function hasEmailConfig() {
  return Boolean(process.env["RESEND_API_KEY"] && process.env["ALERT_FROM_EMAIL"]);
}

export async function sendEmail(message: { to: string; subject: string; text: string }) {
  const apiKey = process.env["RESEND_API_KEY"];
  const from = process.env["ALERT_FROM_EMAIL"];
  if (!apiKey || !from) {
    throw new Error("Email sending isn't configured. Set RESEND_API_KEY and ALERT_FROM_EMAIL.");
  }
  const replyTo = process.env["ALERT_REPLY_TO"];

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [message.to],
      subject: message.subject,
      text: message.text,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Resend rejected the email (${res.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`,
    );
  }
  return (await res.json()) as { id: string };
}
