import { NextResponse } from "next/server";
import { AUTH_COOKIE, tokenFor } from "@/lib/auth";

export async function POST(req: Request) {
  const { password } = await req.json();
  const expected = process.env.APP_PASSWORD;
  if (!expected || password !== expected) return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, await tokenFor(expected), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return res;
}
