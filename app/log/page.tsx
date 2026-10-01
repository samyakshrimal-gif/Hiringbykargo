import Link from "next/link";
import { listCandidates } from "@/lib/store";
import { VERDICT_LABEL } from "@/lib/rubric";
import { DecisionStamp, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Log() {
  const decided = (await listCandidates())
    .filter((c) => c.decision && c.analysis)
    .sort((a, b) => (b.decided_at ?? "").localeCompare(a.decided_at ?? ""));

  const agreed = decided.filter((c) => {
    const v = c.analysis!.by_role[c.role].verdict;
    return c.decision === "hold" ? v === "review" : c.decision === v;
  }).length;
  const emailed = decided.filter((c) => c.email_status === "sent" || c.email_status === "simulated").length;

  return (
    <div>
      <PageHeader eyebrow="Every call, with the reason behind it" title="Decision log" />

      <div className="mb-8 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-line bg-line">
        {[
          { v: decided.length, l: "Decisions recorded" },
          { v: decided.length ? `${Math.round((agreed / decided.length) * 100)}%` : "—", l: "Agreed with the system" },
          { v: emailed, l: "Candidates who heard back" },
        ].map((s) => (
          <div key={s.l} className="bg-card px-5 py-4">
            <div className="font-display text-4xl leading-none">{s.v}</div>
            <div className="mt-2 text-xs text-muted">{s.l}</div>
          </div>
        ))}
      </div>

      {decided.length === 0 ? (
        <div className="card px-6 py-12 text-center text-sm text-muted">No decisions yet. They&apos;ll appear here with the reason you gave.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[44rem] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-5 py-3 font-normal">When</th>
                <th className="px-5 py-3 font-normal">Candidate</th>
                <th className="px-5 py-3 font-normal">System</th>
                <th className="px-5 py-3 font-normal">Decision</th>
                <th className="px-5 py-3 font-normal">Reason</th>
                <th className="px-5 py-3 font-normal">Email</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {decided.map((c) => {
                const ra = c.analysis!.by_role[c.role];
                return (
                  <tr key={c.id} className="align-top">
                    <td className="px-5 py-3 font-mono text-xs whitespace-nowrap text-muted">
                      {new Date(c.decided_at!).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </td>
                    <td className="px-5 py-3">
                      <Link href={`/candidates/${c.id}`} className="font-medium hover:underline">
                        {c.name}
                      </Link>
                      <div className="text-xs text-muted">{c.role}</div>
                    </td>
                    <td className="px-5 py-3 text-xs whitespace-nowrap">
                      {VERDICT_LABEL[ra.verdict]} · <span className="font-mono">{ra.total}</span>
                    </td>
                    <td className="px-5 py-3">
                      <DecisionStamp decision={c.decision!} />
                    </td>
                    <td className="px-5 py-3 text-ink-2">{c.decision_note}</td>
                    <td className="px-5 py-3 text-xs whitespace-nowrap">
                      {c.email_status === "sent" && <span className="text-go">Sent</span>}
                      {c.email_status === "simulated" && <span className="text-muted">Simulated</span>}
                      {c.email_status === "failed" && <span className="text-stop">Failed</span>}
                      {!c.email_status && <span className="text-muted">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
