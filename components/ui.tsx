import type { Decision, Verdict } from "@/lib/types";
import { THRESHOLDS, VERDICT_LABEL } from "@/lib/rubric";

const VERDICT_STYLE: Record<Verdict, string> = {
  advance: "bg-go-soft text-go",
  review: "bg-mid-soft text-mid",
  pass: "bg-stop-soft text-stop",
};

export function VerdictPill({ verdict, prefix }: { verdict: Verdict; prefix?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${VERDICT_STYLE[verdict]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {prefix}
      {VERDICT_LABEL[verdict]}
    </span>
  );
}

const DECISION_STYLE: Record<Decision, string> = {
  advance: "border-go text-go",
  pass: "border-stop text-stop",
  hold: "border-mid text-mid",
};
const DECISION_LABEL: Record<Decision, string> = { advance: "Advanced", pass: "Passed", hold: "On hold" };

export function DecisionStamp({ decision }: { decision: Decision }) {
  return (
    <span
      className={`inline-block -rotate-2 rounded border-2 px-2 py-0.5 font-mono text-[11px] font-medium tracking-widest uppercase ${DECISION_STYLE[decision]}`}
    >
      {DECISION_LABEL[decision]}
    </span>
  );
}

// Horizontal score meter with the two decision thresholds marked.
export function ScoreMeter({ value, verdict }: { value: number; verdict: Verdict }) {
  const color = verdict === "advance" ? "bg-go" : verdict === "review" ? "bg-mid" : "bg-stop";
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-2 w-full min-w-24 rounded-full bg-line">
        <div className={`absolute inset-y-0 left-0 rounded-full ${color}`} style={{ width: `${value}%` }} />
        <div className="absolute -top-1 h-4 w-px bg-ink/25" style={{ left: `${THRESHOLDS.review}%` }} />
        <div className="absolute -top-1 h-4 w-px bg-ink/40" style={{ left: `${THRESHOLDS.advance}%` }} />
      </div>
      <span className="w-8 text-right font-mono text-sm tabular-nums">{value}</span>
    </div>
  );
}

export function Dots({ score }: { score: number }) {
  return (
    <span className="inline-flex gap-1" aria-label={`${score} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`h-2.5 w-2.5 rounded-full ${i <= score ? "bg-ink" : "border border-line-2"}`} />
      ))}
    </span>
  );
}

export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="mt-1 font-display text-5xl leading-none tracking-tight sm:text-6xl">{title}</h1>
      </div>
      {children}
    </header>
  );
}
