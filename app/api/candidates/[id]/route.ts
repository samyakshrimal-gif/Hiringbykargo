import { NextResponse } from "next/server";
import { deleteCandidate, getCandidate } from "@/lib/store";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const c = await getCandidate((await params).id);
  return c ? NextResponse.json(c) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await deleteCandidate((await params).id);
  return NextResponse.json({ ok: true });
}
