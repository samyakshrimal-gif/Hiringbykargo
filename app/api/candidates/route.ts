import { NextResponse } from "next/server";
import { fileToText, prepare } from "@/lib/extract";
import { assess } from "@/lib/pipeline";
import { insertCandidate, listCandidates } from "@/lib/store";
import type { Role } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET() {
  return NextResponse.json(await listCandidates());
}

// One CV per request; the upload page fans out so long batches never hit
// a function timeout and progress is visible per file.
export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  const role = form.get("role") as Role;
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (role !== "PM" && role !== "SPM") return NextResponse.json({ error: "Role must be PM or SPM" }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "File over 10 MB" }, { status: 400 });

  let text: string;
  try {
    text = await fileToText(file.name, Buffer.from(await file.arrayBuffer()));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not read file" }, { status: 422 });
  }
  if (text.trim().length < 80) {
    return NextResponse.json({ error: "No readable text. Is this a scanned image?" }, { status: 422 });
  }

  const p = prepare(text, file.name);
  const base = {
    role,
    file_name: file.name,
    name: p.name,
    email: p.email,
    phone: p.phone,
    redacted_text: p.redacted,
    redactions: p.redactions,
    decision: null,
    decision_note: null,
    decided_at: null,
    email_status: null,
    email_sent_at: null,
    email_error: null,
  };
  try {
    const { analysis, drafts } = await assess(p.redacted, role);
    const c = await insertCandidate({ ...base, status: "scored", error: null, analysis, drafts });
    return NextResponse.json(c);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const c = await insertCandidate({ ...base, status: "error", error: msg, analysis: null, drafts: null });
    return NextResponse.json(c, { status: 502 });
  }
}
