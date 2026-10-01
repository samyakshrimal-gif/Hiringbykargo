"use client";

import { useState } from "react";
import { CRITERIA } from "@/lib/rubric";
import { ROLE_LABEL, type Analysis, type Role } from "@/lib/types";
import { Dots } from "./ui";

export function Breakdown({ analysis, applied }: { analysis: Analysis; applied: Role }) {
  const [role, setRole] = useState<Role>(applied);
  const ra = analysis.by_role[role];
  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
        <div>
          <div className="eyebrow">Score breakdown</div>
          <div className="font-display text-2xl">
            {ra.total} as {ROLE_LABEL[role]}
          </div>
        </div>
        <div className="inline-flex rounded-full border border-line-2 p-0.5 text-xs">
          {(["PM", "SPM"] as Role[]).map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`rounded-full px-3 py-1 ${r === role ? "bg-ink text-paper" : "text-muted"}`}
            >
              {r} · {analysis.by_role[r].total}
            </button>
          ))}
        </div>
      </div>
      <ul className="divide-y divide-line">
        {CRITERIA.map((c) => {
          const s = ra.criteria.find((x) => x.key === c.key)!;
          return (
            <li key={c.key} className="grid gap-2 px-5 py-4 sm:grid-cols-[13rem_1fr] sm:gap-6 sm:px-6">
              <div>
                <div className="text-sm font-medium">{c.label}</div>
                <div className="mt-1.5 flex items-center gap-3">
                  <Dots score={s.score} />
                  <span className="font-mono text-[11px] text-muted">{c.weight[role]}% wt</span>
                </div>
              </div>
              <p className={`text-sm leading-relaxed ${s.evidence.startsWith("No evidence") ? "text-muted italic" : "text-ink-2"}`}>{s.evidence}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
