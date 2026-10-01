"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Shortlist", n: "01" },
  { href: "/upload", label: "Add CVs", n: "02" },
  { href: "/calibration", label: "Calibration", n: "03" },
  { href: "/log", label: "Decision log", n: "04" },
];

interface Status {
  ai: boolean;
  storage: string;
  email: boolean;
  testRecipient: boolean;
}

function Dot({ on }: { on: boolean }) {
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${on ? "bg-go" : "bg-mid"}`} />;
}

export function Sidebar({ status }: { status: Status }) {
  const path = usePathname();
  if (path === "/login") return null;
  const active = (href: string) => (href === "/" ? path === "/" || path.startsWith("/candidates") : path.startsWith(href));

  return (
    <aside className="border-b border-line bg-card lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:border-r lg:border-b-0">
      <div className="flex h-full flex-col px-4 py-4 lg:px-6 lg:py-8">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-display text-3xl leading-none">Kargo</span>
          <span className="eyebrow">shortlist</span>
        </Link>
        <p className="mt-2 hidden text-xs leading-relaxed text-muted lg:block">
          The system recommends. Arjun decides. That decision is the last thing he touches.
        </p>

        <nav className="-mx-1 mt-4 flex gap-1 overflow-x-auto lg:mx-0 lg:mt-10 lg:flex-col">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                active(n.href) ? "bg-ink text-paper" : "text-ink-2 hover:bg-paper"
              }`}
            >
              <span className={`font-mono text-[10px] ${active(n.href) ? "text-paper/60" : "text-muted"}`}>{n.n}</span>
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto hidden space-y-2 border-t border-line pt-5 text-xs text-muted lg:block">
          <div className="eyebrow mb-3">System</div>
          <div className="flex items-center gap-2">
            <Dot on={status.ai} /> {status.ai ? "Claude scoring" : "Heuristic scoring (no API key)"}
          </div>
          <div className="flex items-center gap-2">
            <Dot on={status.storage === "supabase"} /> {status.storage === "supabase" ? "Supabase" : "Local file storage"}
          </div>
          <div className="flex items-center gap-2">
            <Dot on={status.email} />
            {status.email ? (status.testRecipient ? "Resend (test inbox)" : "Resend live") : "Emails simulated"}
          </div>
        </div>
      </div>
    </aside>
  );
}
