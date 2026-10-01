import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { firstName } from "@/lib/extract";
import { getCandidate, updateCandidate } from "@/lib/store";
import type { Decision } from "@/lib/types";

// The founder's decision is the last human touch: recording it sends the
// matching email (advance → invite, pass → rejection). Hold sends nothing.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const c = await getCandidate(id);
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (c.email_status === "sent" || c.email_status === "simulated") {
    return NextResponse.json({ error: "This candidate has already been emailed." }, { status: 409 });
  }

  const { decision, note, subject, body } = (await req.json()) as {
    decision: Decision;
    note: string;
    subject?: string;
    body?: string;
  };
  if (!["advance", "pass", "hold"].includes(decision)) return NextResponse.json({ error: "Bad decision" }, { status: 400 });
  if (!note?.trim()) return NextResponse.json({ error: "Add a one-line reason so the decision is on record." }, { status: 400 });

  const now = new Date().toISOString();
  if (decision === "hold") {
    return NextResponse.json(await updateCandidate(id, { decision, decision_note: note.trim(), decided_at: now }));
  }
  if (!subject?.trim() || !body?.trim()) return NextResponse.json({ error: "Email subject and body are required" }, { status: 400 });

  const text = body.replaceAll("{{first_name}}", firstName(c.name));
  const sent = await sendEmail(c.email, subject.replaceAll("{{first_name}}", firstName(c.name)), text);
  const updated = await updateCandidate(id, {
    decision,
    decision_note: note.trim(),
    decided_at: now,
    email_status: sent.status,
    email_sent_at: sent.status === "failed" ? null : now,
    email_error: sent.error,
  });
  return NextResponse.json(updated, { status: sent.status === "failed" ? 502 : 200 });
}
