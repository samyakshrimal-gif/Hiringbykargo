import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, tokenFor } from "@/lib/auth";

// CVs contain personal data, so a deployed instance should set APP_PASSWORD.
export async function middleware(req: NextRequest) {
  const pw = process.env.APP_PASSWORD;
  if (!pw) return NextResponse.next();
  const { pathname } = req.nextUrl;
  if (pathname === "/login" || pathname === "/api/login") return NextResponse.next();
  if (req.cookies.get(AUTH_COOKIE)?.value === (await tokenFor(pw))) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"] };
