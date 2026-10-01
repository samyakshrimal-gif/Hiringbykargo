"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Hire } from "@/lib/types";

const RATING_TONE: Record<Hire["rating"], string> = {
  "Exceeds Expectations": "text-go",
  "Meets Expectations": "text-mid",
  "Below Expectations": "text-stop",
};

export function HireEditor({ hires, isExtracted }: { hires: Hire[]; isExtracted: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>(Object.fromEntries(hires.map((h) => [h.id, h.notes])));
  const [saving, setSaving] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(h: Hire, patch: Partial<Hire>) {
    setSaving(h.id);
    await fetch("/api/hires", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: h.id, ...patch }) });
    setSaving(null);
    router.refresh();
  }

  async function extract() {
    setExtracting(true);
    setMsg(null);
    const res = await fetch("/api/pattern", { method: "POST" });
    const body = await res.json().catch(() => ({}));
    setMsg(res.ok ? { ok: true, text: "Pattern updated. Re-score candidates to apply it." } : { ok: false, text: body.error || "Failed" });
    setExtracting(false);
    router.refresh();
  }

  async function reset() {
    await fetch("/api/pattern", { method: "DELETE" });
    router.refresh();
  }

  const filled = hires.filter((h) => h.notes.trim()).length;

  return (
    <div>
      <ul className="card divide-y divide-line">
        {hires.map((h) => {
          const thriving = h.rating === "Exceeds Expectations" && h.still_at_kargo;
          const isOpen = open === h.id;
          return (
            <li key={h.id}>
              <button onClick={() => setOpen(isOpen ? null : h.id)} className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-paper/60 sm:px-5">
                <span className={`h-2 w-2 shrink-0 rounded-full ${thriving ? "bg-go" : "bg-line-2"}`} title={thriving ? "Thriving" : ""} />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{h.name}</span>
                  <span className="block text-xs text-muted">
                    {h.role} · joined {h.joined}
                    {!h.still_at_kargo && " · left"}
                  </span>
                </span>
                <span className={`hidden text-xs sm:block ${RATING_TONE[h.rating]}`}>{h.rating}</span>
                <span className={`font-mono text-[10px] ${h.notes.trim() ? "text-go" : "text-muted"}`}>{h.notes.trim() ? "PROFILE ✓" : "NO PROFILE"}</span>
              </button>
              {isOpen && (
                <div className="space-y-3 border-t border-line bg-paper/40 px-4 py-4 sm:px-5">
                  <textarea
                    className="field min-h-40 font-mono text-xs leading-relaxed"
                    placeholder="Paste the profile: what stood out in their application, what the interview revealed, outcome note…"
                    value={drafts[h.id] ?? ""}
                    onChange={(e) => setDrafts({ ...drafts, [h.id]: e.target.value })}
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <button className="btn btn-ink !py-1.5 text-xs" disabled={saving === h.id} onClick={() => save(h, { notes: drafts[h.id] ?? "" })}>
                      {saving === h.id ? "Saving…" : "Save profile"}
                    </button>
                    <label className="flex items-center gap-2 text-xs text-ink-2">
                      <input type="checkbox" checked={h.still_at_kargo} onChange={(e) => save(h, { still_at_kargo: e.target.checked })} />
                      Still at Kargo
                    </label>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button className="btn btn-accent" disabled={extracting || filled === 0} onClick={extract}>
          {extracting ? "Reading the hires…" : `Extract pattern from ${filled} profile${filled === 1 ? "" : "s"}`}
        </button>
        {isExtracted && (
          <button className="btn btn-ghost" onClick={reset}>
            Reset to hypothesis
          </button>
        )}
        {msg && <span className={`text-sm ${msg.ok ? "text-go" : "text-stop"}`}>{msg.text}</span>}
      </div>
    </div>
  );
}
