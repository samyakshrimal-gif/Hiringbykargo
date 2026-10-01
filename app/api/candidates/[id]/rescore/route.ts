import { NextResponse } from "next/server";
import { assess } from "@/lib/pipeline";
import { getCandidate, updateCandidate } from "@/lib/store";

export const maxDuration = 300;

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const c = await getCandidate(id);
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const { analysis, drafts } = await assess(c.redacted_text, c.role);
    return NextResponse.json(await updateCandidate(id, { analysis, drafts, status: "scored", error: null }));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await updateCandidate(id, { error: msg });
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
