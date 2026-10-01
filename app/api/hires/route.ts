import { NextResponse } from "next/server";
import { listHires, updateHire } from "@/lib/store";

export async function GET() {
  return NextResponse.json(await listHires());
}

export async function PATCH(req: Request) {
  const { id, ...patch } = await req.json();
  const allowed = ["notes", "still_at_kargo", "rating"] as const;
  const clean = Object.fromEntries(Object.entries(patch).filter(([k]) => (allowed as readonly string[]).includes(k)));
  await updateHire(id, clean);
  return NextResponse.json({ ok: true });
}
