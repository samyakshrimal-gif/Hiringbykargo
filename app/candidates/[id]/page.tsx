import Link from "next/link";
import { notFound } from "next/navigation";
import { getCandidate } from "@/lib/store";
import { ROLE_LABEL } from "@/lib/types";
import { VerdictPill } from "@/components/ui";
import { Breakdown } from "@/components/Breakdown";
import { DecisionPanel } from "@/components/DecisionPanel";
import { CandidateActions } from "@/components/CandidateActions";

export const dynamic = "force-dynamic";

export default async function CandidatePage({ params }: { params: Promise<{ id: string }> }) {
  const c = await getCandidate((await params).id);
  if (!c) notFound();
  const a = c.analysis;

  return (
    <div>
      <Link href={`/?role=${c.role}`} className="text-sm text-muted hover:text-ink">
        ← Shortlist
      </Link>

      <header className="mt-4 mb-8 flex flex-col gap-4 border-b border-line pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="eyebrow">Applied · {ROLE_LABEL[c.role]}</div>
          <h1 className="mt-1 font-display text-5xl leading-none sm:text-6xl">{c.name}</h1>
          {a && <p className="mt-3 max-w-2xl text-ink-2">{a.headline}</p>}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-muted">
            <span>{c.file_name}</span>
            {c.email && <span>{c.email}</span>}
            {a && <span>{a.years_experience} yrs · {a.experience_fit}</span>}
          </div>
        </div>
        {a && (
          <div className="flex shrink-0 items-end gap-4">
            <div className="text-right">
              <div className="font-display text-7xl leading-none tabular-nums">{a.by_role[c.role].total}</div>
              <div className="eyebrow mt-1">out of 100</div>
            </div>
            <VerdictPill verdict={a.by_role[c.role].verdict} prefix="System: " />
          </div>
        )}
      </header>

      {c.status === "error" || !a || !c.drafts ? (
        <div className="card p-6">
          <div className="font-display text-2xl">Scoring failed</div>
          <p className="mt-2 text-sm text-stop">{c.error}</p>
          <div className="mt-4">
            <CandidateActions id={c.id} />
          </div>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_24rem]">
          <div className="min-w-0 space-y-8">
            <section>
              <div className="eyebrow mb-2">Why the system ranked them here</div>
              <p className="font-display text-2xl leading-snug">{a.why_ranked}</p>
              {a.best_fit_role !== c.role && (
                <p className="mt-3 rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent">
                  Scores higher as {ROLE_LABEL[a.best_fit_role]} ({a.by_role[a.best_fit_role].total}). Worth considering for that role.
                </p>
              )}
            </section>

            <div className="grid gap-4 sm:grid-cols-2">
              <section className="card p-5">
                <div className="eyebrow mb-3">Success-pattern signals</div>
                {a.pattern_signals_found.length ? (
                  <ul className="space-y-2 text-sm">
                    {a.pattern_signals_found.map((s) => (
                      <li key={s} className="flex gap-2">
                        <span className="text-go">+</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted">None clearly evidenced.</p>
                )}
              </section>
              <section className="card p-5">
                <div className="eyebrow mb-3">Red flags</div>
                {a.red_flags.length ? (
                  <ul className="space-y-2 text-sm">
                    {a.red_flags.map((s) => (
                      <li key={s} className="flex gap-2">
                        <span className="text-stop">!</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted">None raised.</p>
                )}
              </section>
            </div>

            <Breakdown analysis={a} applied={c.role} />

            <section className="card p-5 sm:p-6">
              <div className="eyebrow mb-1">Interview brief</div>
              <h2 className="font-display text-3xl">What to probe</h2>
              <ol className="mt-4 space-y-3">
                {c.drafts.brief.probe_questions.map((q, i) => (
                  <li key={i} className="flex gap-3 text-sm leading-relaxed">
                    <span className="font-mono text-xs text-accent">{String(i + 1).padStart(2, "0")}</span>
                    {q}
                  </li>
                ))}
              </ol>
              {c.drafts.brief.verify_claims.length > 0 && (
                <>
                  <div className="eyebrow mt-6 mb-2">Verify</div>
                  <ul className="space-y-2 text-sm text-ink-2">
                    {c.drafts.brief.verify_claims.map((v, i) => (
                      <li key={i}>— {v}</li>
                    ))}
                  </ul>
                </>
              )}
            </section>

            <details className="card p-5">
              <summary className="cursor-pointer text-sm font-medium">
                What the AI saw <span className="text-muted">({c.redactions} personal details redacted)</span>
              </summary>
              <pre className="mt-4 max-h-96 overflow-auto font-mono text-xs leading-relaxed whitespace-pre-wrap text-ink-2">{c.redacted_text}</pre>
            </details>

            <div className="flex items-center justify-between text-xs text-muted">
              <span>Scored by {{ gemini: "Gemini", claude: "Claude", heuristic: "keyword heuristic" }[a.scored_by]}</span>
              <CandidateActions id={c.id} />
            </div>
          </div>

          <div className="lg:sticky lg:top-8 lg:h-fit">
            <DecisionPanel candidate={c} />
          </div>
        </div>
      )}
    </div>
  );
}
