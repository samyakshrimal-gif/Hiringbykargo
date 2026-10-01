import Link from "next/link";
import { listCandidates } from "@/lib/store";
import { ROLE_LABEL, type Candidate, type Role } from "@/lib/types";
import { DecisionStamp, PageHeader, ScoreMeter, VerdictPill } from "@/components/ui";

export const dynamic = "force-dynamic";

type Filter = "awaiting" | "decided" | "all";

function rankFor(cands: Candidate[], role: Role) {
  return cands
    .filter((c) => c.role === role && c.status === "scored" && c.analysis)
    .sort((a, b) => b.analysis!.by_role[role].total - a.analysis!.by_role[role].total);
}

export default async function Shortlist({ searchParams }: { searchParams: Promise<{ role?: string; show?: string }> }) {
  const sp = await searchParams;
  const role: Role = sp.role === "SPM" ? "SPM" : "PM";
  const show: Filter = sp.show === "decided" || sp.show === "all" ? sp.show : "awaiting";

  const all = await listCandidates();
  const ranked = rankFor(all, role);
  const errors = all.filter((c) => c.role === role && c.status === "error");
  const isAwaiting = (c: Candidate) => !c.decision || c.decision === "hold";
  const visible = ranked.filter((c) => (show === "all" ? true : show === "awaiting" ? isAwaiting(c) : !isAwaiting(c)));

  const stats = [
    { label: "In the pile", value: ranked.length },
    { label: "Awaiting your call", value: ranked.filter(isAwaiting).length },
    { label: "Recommended to advance", value: ranked.filter((c) => c.analysis!.by_role[role].verdict === "advance").length },
    { label: "Heard back", value: ranked.filter((c) => c.email_status === "sent" || c.email_status === "simulated").length },
  ];

  const href = (r: Role, s: Filter) => `/?role=${r}&show=${s}`;

  return (
    <div>
      <PageHeader eyebrow={`Ranked against the Kargo success pattern`} title="Shortlist">
        <Link href="/upload" className="btn btn-ink self-start sm:self-auto">
          + Add CVs
        </Link>
      </PageHeader>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-full border border-line-2 bg-card p-1">
          {(["PM", "SPM"] as Role[]).map((r) => (
            <Link
              key={r}
              href={href(r, show)}
              className={`rounded-full px-4 py-1.5 text-sm transition-colors ${r === role ? "bg-ink text-paper" : "text-ink-2 hover:text-ink"}`}
            >
              <span className="sm:hidden">{r}</span>
              <span className="hidden sm:inline">{ROLE_LABEL[r]}</span>
            </Link>
          ))}
        </div>
        <div className="flex gap-1 text-sm">
          {(["awaiting", "decided", "all"] as Filter[]).map((s) => (
            <Link
              key={s}
              href={href(role, s)}
              className={`rounded-full px-3 py-1.5 capitalize ${s === show ? "bg-accent-soft text-accent" : "text-muted hover:text-ink"}`}
            >
              {s}
            </Link>
          ))}
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-card px-5 py-4">
            <div className="font-display text-4xl leading-none">{s.value}</div>
            <div className="mt-2 text-xs text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {ranked.length === 0 ? (
        <div className="card flex flex-col items-center px-6 py-16 text-center">
          <div className="font-display text-3xl">Nothing ranked yet</div>
          <p className="mt-2 max-w-md text-sm text-muted">
            Drop in the {ROLE_LABEL[role]} CVs. Each is stripped of personal details, scored for both roles against the success
            pattern, and arrives here with an interview brief and draft emails ready.
          </p>
          <Link href="/upload" className="btn btn-ink mt-6">
            Add CVs
          </Link>
        </div>
      ) : visible.length === 0 ? (
        <div className="card px-6 py-12 text-center text-sm text-muted">No candidates in this view.</div>
      ) : (
        <ol className="card divide-y divide-line overflow-hidden">
          {visible.map((c) => {
            const a = c.analysis!;
            const ra = a.by_role[role];
            const rank = ranked.indexOf(c) + 1;
            return (
              <li key={c.id}>
                <Link
                  href={`/candidates/${c.id}`}
                  className="grid grid-cols-[2.5rem_1fr] items-center gap-x-4 gap-y-3 px-4 py-4 transition-colors hover:bg-paper/70 sm:px-6 md:grid-cols-[3rem_1fr_11rem_8rem]"
                >
                  <span className="font-display text-3xl leading-none text-muted tabular-nums">{rank}</span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{c.name}</span>
                      {a.best_fit_role !== role && (
                        <span className="rounded border border-line-2 px-1.5 py-0.5 font-mono text-[10px] text-muted">
                          better fit: {a.best_fit_role}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 truncate text-sm text-muted">{a.headline}</div>
                    {a.pattern_signals_found.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {a.pattern_signals_found.slice(0, 3).map((s) => (
                          <span key={s} className="rounded-full bg-paper px-2 py-0.5 text-[11px] text-ink-2">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="col-start-2 md:col-start-auto">
                    <ScoreMeter value={ra.total} verdict={ra.verdict} />
                  </div>
                  <div className="col-start-2 flex md:col-start-auto md:justify-end">
                    {c.decision ? <DecisionStamp decision={c.decision} /> : <VerdictPill verdict={ra.verdict} />}
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      )}

      {errors.length > 0 && (
        <div className="mt-6 rounded-xl border border-stop/30 bg-stop-soft px-4 py-3 text-sm text-stop">
          {errors.length} CV{errors.length > 1 ? "s" : ""} failed to score:{" "}
          {errors.map((e, i) => (
            <span key={e.id}>
              {i > 0 && ", "}
              <Link href={`/candidates/${e.id}`} className="underline">
                {e.file_name}
              </Link>
            </span>
          ))}
        </div>
      )}

      <p className="mt-6 text-xs text-muted">
        Ticks on each meter mark the thresholds: 50 means it's your call, 70 means advance. Scores are recommendations; nothing is sent until you decide.
      </p>
    </div>
  );
}
