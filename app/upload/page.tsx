"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ROLE_LABEL, type Role } from "@/lib/types";
import { PageHeader } from "@/components/ui";

type Item = { file: File; state: "queued" | "working" | "done" | "error"; msg?: string; id?: string };

const ACCEPT = ".pdf,.docx,.txt,.md";
const CONCURRENCY = 3;

export default function Upload() {
  const [role, setRole] = useState<Role>("PM");
  const [items, setItems] = useState<Item[]>([]);
  const [running, setRunning] = useState(false);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const add = (files: FileList | null) => {
    if (!files) return;
    const fresh = Array.from(files)
      .filter((f) => /\.(pdf|docx|txt|md)$/i.test(f.name))
      .map((file) => ({ file, state: "queued" as const }));
    setItems((prev) => [...prev.filter((p) => p.state !== "queued" || !fresh.some((f) => f.file.name === p.file.name)), ...fresh]);
  };

  const patch = (i: number, p: Partial<Item>) => setItems((prev) => prev.map((it, j) => (j === i ? { ...it, ...p } : it)));

  async function run() {
    setRunning(true);
    const queue = items.map((it, i) => ({ it, i })).filter(({ it }) => it.state === "queued" || it.state === "error");
    const worker = async () => {
      for (let next = queue.shift(); next; next = queue.shift()) {
        patch(next.i, { state: "working", msg: undefined });
        const fd = new FormData();
        fd.append("file", next.it.file);
        fd.append("role", role);
        try {
          const res = await fetch("/api/candidates", { method: "POST", body: fd });
          const body = await res.json().catch(() => ({}));
          if (res.ok) patch(next.i, { state: "done", id: body.id, msg: `${body.analysis.by_role[role].total} / 100` });
          else patch(next.i, { state: "error", msg: body.error || `Failed (${res.status})`, id: body.id });
        } catch {
          patch(next.i, { state: "error", msg: "Network error" });
        }
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    setRunning(false);
  }

  const counts = {
    done: items.filter((i) => i.state === "done").length,
    pending: items.filter((i) => i.state === "queued" || i.state === "error").length,
  };

  return (
    <div>
      <PageHeader eyebrow="Trigger · founder uploads CVs" title="Add CVs" />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div>
          <div className="mb-4">
            <div className="eyebrow mb-2">Applied for</div>
            <div className="inline-flex rounded-full border border-line-2 bg-card p-1">
              {(["PM", "SPM"] as Role[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  disabled={running}
                  className={`rounded-full px-4 py-1.5 text-sm ${r === role ? "bg-ink text-paper" : "text-ink-2"}`}
                >
                  {ROLE_LABEL[r]}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => input.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              add(e.dataTransfer.files);
            }}
            className={`flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors ${
              drag ? "border-accent bg-accent-soft" : "border-line-2 bg-card hover:border-ink"
            }`}
          >
            <span className="font-display text-3xl">Drop CVs here</span>
            <span className="mt-2 text-sm text-muted">PDF, DOCX or TXT. Select as many as you like.</span>
          </button>
          <input ref={input} type="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => add(e.target.files)} />

          {items.length > 0 && (
            <ul className="card mt-6 divide-y divide-line">
              {items.map((it, i) => (
                <li key={i} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <StateIcon state={it.state} />
                  <span className="min-w-0 flex-1 truncate">{it.file.name}</span>
                  {it.msg && (
                    <span className={`shrink-0 font-mono text-xs ${it.state === "error" ? "text-stop" : "text-muted"}`}>{it.msg}</span>
                  )}
                  {it.id && it.state === "done" && (
                    <Link href={`/candidates/${it.id}`} className="shrink-0 text-xs underline">
                      open
                    </Link>
                  )}
                  {it.state === "queued" && !running && (
                    <button onClick={() => setItems((p) => p.filter((_, j) => j !== i))} className="shrink-0 text-xs text-muted hover:text-ink">
                      remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button className="btn btn-accent" disabled={running || counts.pending === 0} onClick={run}>
              {running ? "Scoring…" : `Score ${counts.pending || ""} CV${counts.pending === 1 ? "" : "s"}`}
            </button>
            {counts.done > 0 && !running && (
              <Link href={`/?role=${role}`} className="btn btn-ghost">
                View shortlist →
              </Link>
            )}
          </div>
        </div>

        <aside className="card h-fit p-5 text-sm">
          <div className="eyebrow mb-3">What happens to each CV</div>
          <ol className="space-y-3 text-ink-2">
            {[
              ["Extract", "Text is pulled from the file."],
              ["Redact", "Name, email, phone, links and personal fields are stripped before anything reaches the AI."],
              ["Score", "Rated on 7 criteria for both PM and SPM, weighted toward the success pattern from past hires."],
              ["Draft", "Interview brief, invite and rejection emails, ready for your decision."],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-3">
                <span className="font-mono text-xs text-accent">{String(i + 1).padStart(2, "0")}</span>
                <span>
                  <b className="font-medium text-ink">{t}.</b> {d}
                </span>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}

function StateIcon({ state }: { state: Item["state"] }) {
  if (state === "working") return <span className="h-3 w-3 animate-spin rounded-full border-2 border-ink border-t-transparent" />;
  const c = { queued: "bg-line-2", done: "bg-go", error: "bg-stop" }[state];
  return <span className={`h-2.5 w-2.5 rounded-full ${c}`} />;
}
