import { Resend } from "resend";

export interface SendResult {
  status: "sent" | "simulated" | "failed";
  error: string | null;
}

// Resend's free tier only delivers to your own address until a domain is
// verified, so EMAIL_TEST_RECIPIENT redirects every send while testing.
export async function sendEmail(to: string | null, subject: string, body: string): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { status: "simulated", error: null };
  const recipient = process.env.EMAIL_TEST_RECIPIENT || to;
  if (!recipient) return { status: "failed", error: "No email address found on the CV." };
  try {
    const { error } = await new Resend(key).emails.send({
      from: process.env.RESEND_FROM || "Kargo Hiring <onboarding@resend.dev>",
      to: recipient,
      subject,
      text: body,
    });
    if (error) return { status: "failed", error: error.message };
    return { status: "sent", error: null };
  } catch (e) {
    return { status: "failed", error: e instanceof Error ? e.message : String(e) };
  }
}
