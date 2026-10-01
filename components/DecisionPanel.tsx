"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Candidate, Decision } from "@/lib/types";
import { VERDICT_LABEL } from "@/lib/rubric";
import { DecisionStamp } from "./ui";

const REASONS: Record<Decision, string[]> = {
  advance: ["Agree with ranking", "Strong pattern match", "Operator background", "Worth a conversation despite gaps"],
  pass: ["Agree with ranking", "Experience gap", "No hands-on evidence", "Better fit for another role"],
  hold: ["Need to compare with others", "Waiting on SPM decision", "Revisit next week"],
};

const OPTIONS: { key: Decision; label: string; tone: string }[] = [
  { key: "advance", label: "Advance", tone: "data-[on=true]:bg-go data-[on=true]:text-white data-[on=true]:border-go" },
  { key: "hold", label: "Hold", tone: "data-[on=true]:bg-mid data-[on=true]:text-white data-[on=true]:border-mid" },
  { key: "pass", label: "Pass", tone: "data-[on=true]:bg-stop data-[on=true]:text-white data-[on=true]:border-stop" },
];

export function DecisionPanel({ candidate: c }: { candidate: Candidate }) {
  const router = useRouter();
  const recommended = c.analysis!.by_role[c.role].verdict;
  const [decision, setDecision] = useState<Decision>(recommended === "pass" ? "pass" : "advance");
  const [note, setNote] = useState("");
  const draftFor = (d: Decision) => (d === "pass" ? c.drafts!.rejection : c.drafts!.invite);
  const [subject, setSubject] = useState(draftFor(decision).subject);
  const [body, setBody] = useState(draftFor(decision).body);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const emailed = c.email_status === "sent" || c.email_status === "simulated";

  if (c.decision && c.decision !== "hold" && emailed) {
    return (
      <div className="card p-6">
        <div className="eyebrow mb-3">Decision on record</div>
        <DecisionStamp decision={c.decision} />
        <p className="mt-4 text-sm">“{c.decision_note}”</p>
        <dl className="mt-5 space-y-2 border-t border-line pt-4 text-xs text-muted">
          <div className="flex justify-between">
            <dt>Decided</dt>
            <dd>{new Date(c.decided_at!).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</dd>
          </div>
          <div className="flex justify-between">
            <dt>System said</dt>
            <dd>{VERDICT_LABEL[recommended]}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Email</dt>
            <dd>{c.email_status === "sent" ? "Delivered via Resend" : "Simulated (no Resend key)"}</dd>
          </div>
        </dl>
      </div>
    );
  }

  function choose(d: Decision) {
    setDecision(d);
    setNote("");
    if (d !== "hold") {
      setSubject(draftFor(d).subject);
      setBody(draftFor(d).body);
    }
  }

  async function submit() {
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/candidates/${c.id}/decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, note, subject, body }),
    });
    if (!res.ok) setErr((await res.json().catch(() => ({}))).error || "Something went wrong");
    setBusy(false);
    router.refresh();
  }

  const firstName = c.name.split(" ")[0];

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-line bg-paper/60 px-5 py-4">
        <div className="eyebrow">Your call</div>
        <p className="mt-1 text-sm text-ink-2">
          System recommends <b className="font-medium text-ink">{VERDICT_LABEL[recommended].toLowerCase()}</b>.
          {c.decision === "hold" && " Currently on hold."}
        </p>
        {c.email_status === "failed" && (
          <p className="mt-2 rounded-lg bg-stop-soft px-3 py-2 text-xs text-stop">
            Last send failed: {c.email_error}. Fix the cause and send again.
          </p>
        )}
      </div>

      <div className="space-y-5 p-5">
        <div className="grid grid-cols-3 gap-2">
          {OPTIONS.map((o) => (
            <button
              key={o.key}
              data-on={decision === o.key}
              onClick={() => choose(o.key)}
              className={`rounded-xl border border-line-2 py-2.5 text-sm font-medium transition-colors ${o.tone}`}
            >
              {o.label}
            </button>
          ))}
        </div>

        <div>
          <label className="eyebrow mb-2 block">Why (kept on record)</label>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {REASONS[decision].map((r) => (
              <button
                key={r}
                onClick={() => setNote(r)}
                className={`rounded-full border px-2.5 py-1 text-xs ${note === r ? "border-ink bg-ink text-paper" : "border-line-2 text-ink-2 hover:border-ink"}`}
              >
                {r}
              </button>
            ))}
          </div>
          <input className="field" value={note} onChange={(e) => setNote(e.target.value)} placeholder="One line is enough" />
        </div>

        {decision !== "hold" ? (
          <div>
            <label className="eyebrow mb-2 block">{decision === "advance" ? "Interview invite" : "Rejection"} to {c.email ?? "no email found"}</label>
            <input className="field mb-2 font-medium" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <textarea className="field min-h-56 resize-y leading-relaxed" value={body} onChange={(e) => setBody(e.target.value)} />
            <p className="mt-1.5 text-[11px] text-muted">
              <code className="font-mono">{"{{first_name}}"}</code> becomes “{firstName}” when sent.
            </p>
          </div>
        ) : (
          <p className="rounded-lg bg-mid-soft px-3 py-2 text-xs text-mid">Hold records your reason and sends nothing. The candidate stays in your queue.</p>
        )}

        {err && <p className="text-sm text-stop">{err}</p>}

        <button className="btn btn-ink w-full" disabled={busy || !note.trim()} onClick={submit}>
          {busy ? "Working…" : decision === "hold" ? "Put on hold" : decision === "advance" ? "Advance & send invite" : "Pass & send note"}
        </button>
        {!c.email && decision !== "hold" && (
          <p className="text-center text-[11px] text-stop">No email address was found on this CV, so sending will fail unless a test inbox is set.</p>
        )}
      </div>
    </div>
  );
}
