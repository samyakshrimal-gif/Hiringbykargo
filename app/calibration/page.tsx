import { getPattern, listHires } from "@/lib/store";
import { CRITERIA, EXPERIENCE_BAND, THRESHOLDS } from "@/lib/rubric";
import { PageHeader } from "@/components/ui";
import { HireEditor } from "@/components/HireEditor";

export const dynamic = "force-dynamic";

export default async function Calibration() {
  const [pattern, hires] = await Promise.all([getPattern(), listHires()]);
  const thriving = hires.filter((h) => h.rating === "Exceeds Expectations" && h.still_at_kargo);

  return (
    <div>
      <PageHeader eyebrow="Context · what “good” looks like at Kargo" title="Calibration" />

      <section className="card mb-8 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-ink px-5 py-4 text-paper sm:px-6">
          <div className="eyebrow !text-paper/60">Success pattern</div>
          <span
            className={`rounded-full px-2.5 py-1 font-mono text-[10px] tracking-wider uppercase ${
              pattern.source === "extracted" ? "bg-go text-white" : "bg-mid text-white"
            }`}
          >
            {pattern.source === "extracted" ? `Extracted ${new Date(pattern.updated_at).toLocaleDateString("en-IN")}` : "Working hypothesis"}
          </span>
        </div>
        <div className="p-5 sm:p-6">
          <p className="font-display text-2xl leading-snug">{pattern.summary}</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {pattern.signals.map((s, i) => (
              <div key={s.name} className="rounded-xl border border-line p-4">
                <div className="font-mono text-xs text-accent">S{i + 1}</div>
                <div className="mt-1 font-medium">{s.name}</div>
                <p className="mt-1 text-sm text-ink-2">{s.description}</p>
                {s.seen_in.length > 0 && <p className="mt-2 text-xs text-muted">Seen in: {s.seen_in.join(", ")}</p>}
              </div>
            ))}
          </div>
          <div className="mt-6">
            <div className="eyebrow mb-2">Anti-signals</div>
            <ul className="flex flex-wrap gap-2">
              {pattern.anti_signals.map((s) => (
                <li key={s} className="rounded-full bg-stop-soft px-3 py-1 text-xs text-stop">
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <section>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <div className="eyebrow">Calibration set · {hires.length} past hires</div>
              <p className="mt-1 text-sm text-muted">
                {thriving.length} count as thriving (Exceeds and still at Kargo). Paste each profile from <code className="font-mono">hires/</code>, then extract.
              </p>
            </div>
          </div>
          <HireEditor hires={hires} isExtracted={pattern.source === "extracted"} />
        </section>

        <aside className="space-y-6">
          <section className="card p-5">
            <div className="eyebrow mb-3">Rubric weights</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th className="pb-2 font-normal">Criterion</th>
                  <th className="pb-2 text-right font-normal">PM</th>
                  <th className="pb-2 text-right font-normal">SPM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {CRITERIA.map((c) => (
                  <tr key={c.key}>
                    <td className="py-2 pr-2">{c.label}</td>
                    <td className="py-2 text-right font-mono tabular-nums">{c.weight.PM}</td>
                    <td className="py-2 text-right font-mono tabular-nums">{c.weight.SPM}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="card space-y-2 p-5 text-sm text-ink-2">
            <div className="eyebrow mb-1">Rules</div>
            <p>
              ≥ {THRESHOLDS.advance} → advance · {THRESHOLDS.review}–{THRESHOLDS.advance - 1} → your call · below {THRESHOLDS.review} → pass
            </p>
            <p>
              Experience bands: PM {EXPERIENCE_BAND.PM.min}–{EXPERIENCE_BAND.PM.max} yrs, SPM {EXPERIENCE_BAND.SPM.min}–{EXPERIENCE_BAND.SPM.max} yrs. Shown as context, never an automatic reject.
            </p>
            <p>The AI never sees names, contact details, age, gender or links. Schools and brands aren&apos;t scored.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
