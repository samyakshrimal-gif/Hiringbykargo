import { NextResponse } from "next/server";
import { extractPattern } from "@/lib/ai";
import { listHires, savePattern } from "@/lib/store";

export const maxDuration = 300;

export async function POST() {
  const hires = await listHires();
  if (!hires.some((h) => h.notes.trim())) {
    return NextResponse.json({ error: "Paste at least a few hire profiles first." }, { status: 400 });
  }
  try {
    const p = await extractPattern(hires);
    const pattern = { ...p, source: "extracted" as const, updated_at: new Date().toISOString() };
    await savePattern(pattern);
    return NextResponse.json(pattern);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}

export async function DELETE() {
  await savePattern(null);
  return NextResponse.json({ ok: true });
}
