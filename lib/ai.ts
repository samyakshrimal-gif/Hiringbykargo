import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod/v4";
import { CRITERIA, EXPERIENCE_BAND, weightedTotal, verdictFor } from "./rubric";
import type { Analysis, Drafts, Hire, Role, SuccessPattern } from "./types";
import { ROLE_LABEL } from "./types";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";
export const aiEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY);

let client: Anthropic | null = null;
const claude = () => (client ??= new Anthropic());

async function structured<T>(schema: z.ZodType<T>, system: string, user: string, maxTokens = 8000): Promise<T> {
  const res = await claude().messages.parse({
    model: MODEL,
    max_tokens: maxTokens,
    output_config: { effort: "medium", format: zodOutputFormat(schema) },
    system,
    messages: [{ role: "user", content: user }],
  });
  if (res.stop_reason === "refusal") throw new Error("The model declined to assess this document.");
  if (res.stop_reason === "max_tokens") throw new Error("The model ran out of room; try again.");
  if (!res.parsed_output) throw new Error("The model returned an unreadable response.");
  return res.parsed_output;
}

const FAIRNESS = `Fairness rules (non-negotiable):
- Personal details have been redacted. Never infer or use gender, age, religion, caste, marital status, nationality or location as a signal.
- University or employer prestige is not a signal on its own. Only what the person did counts.
- If evidence for a criterion is missing, score it low and say "No evidence in CV". Do not guess generously.`;

function patternBlock(p: SuccessPattern) {
  return `Kargo success pattern (${p.source === "default" ? "working hypothesis" : "extracted from past hires"}):
${p.summary}
Signals:
${p.signals.map((s) => `- ${s.name}: ${s.description}`).join("\n")}
Anti-signals:
${p.anti_signals.map((s) => `- ${s}`).join("\n")}`;
}

function rubricBlock() {
  return CRITERIA.map(
    (c) => `- ${c.key} (${c.label}; weight PM ${c.weight.PM}%, SPM ${c.weight.SPM}%): ${c.description}`
  ).join("\n");
}

// ---------------- scoring ----------------

const criterionKey = z.enum(CRITERIA.map((c) => c.key) as [string, ...string[]]);
const ScoreSchema = z.object({
  headline: z.string().describe("One line on who this person is professionally. No names."),
  years_experience: z.number().describe("Total years of relevant professional experience"),
  pattern_signals_found: z.array(z.string()).describe("Names of success-pattern signals clearly evidenced"),
  red_flags: z.array(z.string()),
  why_ranked: z.string().describe("2-3 sentences Arjun can read in 10 seconds: why this candidate sits where they do."),
  pm_scores: z.array(z.object({ key: criterionKey, score: z.number().int(), evidence: z.string() })),
  spm_scores: z.array(z.object({ key: criterionKey, score: z.number().int(), evidence: z.string() })),
});

export async function scoreCandidate(cvText: string, appliedRole: Role, pattern: SuccessPattern): Promise<Analysis> {
  const raw = aiEnabled()
    ? await structured(
        ScoreSchema,
        `You are the screening analyst for Kargo, a Series A logistics SaaS company in Mumbai (40→70 people) that automates shipment tracking, documentation and carrier coordination for mid-sized freight forwarders. The founder, Arjun, is hiring a Product Manager and a Senior Product Manager, both reporting to him directly. There is no Head of Product.

Arjun's job specs haven't predicted who succeeds. Rank candidates by how much they resemble his thriving past hires, using the success pattern below, and use the job-spec criteria as a floor.

${patternBlock(pattern)}

Rubric. Score every criterion 1-5 for BOTH roles (1 = no evidence, 3 = solid, 5 = exceptional and specific). Evidence must quote or closely paraphrase the CV:
${rubricBlock()}

The same evidence can score differently per role. Leadership matters far more for SPM, and expectations of scale are higher.
Experience bands: PM ${EXPERIENCE_BAND.PM.min}-${EXPERIENCE_BAND.PM.max} years, SPM ${EXPERIENCE_BAND.SPM.min}-${EXPERIENCE_BAND.SPM.max} years.

${FAIRNESS}`,
        `The candidate applied for: ${ROLE_LABEL[appliedRole]}.\n\nRedacted CV:\n"""\n${cvText.slice(0, 60000)}\n"""`
      )
    : heuristicScore(cvText, pattern);

  const fill = (arr: { key: string; score: number; evidence: string }[]) =>
    CRITERIA.map((c) => {
      const s = arr.find((x) => x.key === c.key);
      return { key: c.key, score: Math.min(5, Math.max(1, Math.round(s?.score ?? 1))), evidence: s?.evidence ?? "No evidence in CV" };
    });
  const pm = fill(raw.pm_scores);
  const spm = fill(raw.spm_scores);
  const pmTotal = weightedTotal(pm, "PM");
  const spmTotal = weightedTotal(spm, "SPM");
  const yrs = raw.years_experience;
  const band = EXPERIENCE_BAND[appliedRole];
  const experience_fit =
    yrs < band.min ? `Below the ${band.min}+ yr band for ${appliedRole}` : yrs > band.max ? `Above the ${appliedRole} band; may suit a larger scope` : `Within the ${appliedRole} band`;

  return {
    headline: raw.headline,
    years_experience: yrs,
    experience_fit,
    pattern_signals_found: raw.pattern_signals_found,
    red_flags: raw.red_flags,
    why_ranked: raw.why_ranked,
    by_role: {
      PM: { criteria: pm, total: pmTotal, verdict: verdictFor(pmTotal) },
      SPM: { criteria: spm, total: spmTotal, verdict: verdictFor(spmTotal) },
    },
    best_fit_role: spmTotal > pmTotal + 5 && yrs >= EXPERIENCE_BAND.SPM.min ? "SPM" : pmTotal >= spmTotal ? "PM" : yrs >= EXPERIENCE_BAND.SPM.min ? "SPM" : "PM",
    scored_by: aiEnabled() ? "claude" : "heuristic",
  };
}

// ---------------- brief + emails ----------------

const DraftSchema = z.object({
  probe_questions: z.array(z.string()).describe("4-5 sharp interview questions targeting gaps and unverified claims"),
  verify_claims: z.array(z.string()).describe("2-3 specific claims from the CV worth verifying"),
  invite_subject: z.string(),
  invite_body: z.string(),
  rejection_subject: z.string(),
  rejection_body: z.string(),
});

export async function draftFollowUps(cvText: string, role: Role, analysis: Analysis): Promise<Drafts> {
  if (!aiEnabled()) return heuristicDrafts(role, analysis);
  const r = await structured(
    DraftSchema,
    `You write for Arjun Mehta, founder of Kargo (logistics SaaS, Mumbai). He's direct, warm and busy. Draft:
1) An interview brief: what Arjun should probe in a first conversation with this candidate.
2) An interview invitation email.
3) A rejection email.

Email rules:
- Address the candidate as {{first_name}}. That exact placeholder is replaced later. Never invent a name.
- Sign off as "Arjun Mehta, Founder, Kargo".
- Invite: under 120 words. Mention one specific thing from their background that stood out. Ask them to reply with two or three 30-minute slots for this week or next.
- Rejection: under 110 words. Thank them, name one genuine strength from their CV, be honest that the role needs a different profile right now, and leave the door open. No clichés like "after careful consideration". Never reveal scores, rankings or internal notes.
- Plain text, no markdown.`,
    `Role: ${ROLE_LABEL[role]}\nAssessment summary: ${analysis.why_ranked}\nStrengths found: ${analysis.pattern_signals_found.join("; ") || "none listed"}\nRed flags: ${analysis.red_flags.join("; ") || "none"}\n\nRedacted CV:\n"""\n${cvText.slice(0, 40000)}\n"""`,
    4000
  );
  return {
    brief: { probe_questions: r.probe_questions, verify_claims: r.verify_claims },
    invite: { subject: r.invite_subject, body: r.invite_body },
    rejection: { subject: r.rejection_subject, body: r.rejection_body },
  };
}

// ---------------- pattern extraction ----------------

const PatternSchema = z.object({
  summary: z.string(),
  signals: z.array(z.object({ name: z.string(), description: z.string(), seen_in: z.array(z.string()) })),
  anti_signals: z.array(z.string()),
});

export async function extractPattern(hires: Hire[]): Promise<Omit<SuccessPattern, "source" | "updated_at">> {
  if (!aiEnabled()) throw new Error("Set ANTHROPIC_API_KEY to extract a pattern from hire profiles.");
  const profiles = hires
    .map(
      (h) =>
        `### ${h.name}: ${h.role} (joined ${h.joined})\nLast rating: ${h.rating}. ${h.still_at_kargo ? "Still at Kargo." : "Has left Kargo."}\n${h.notes || "(no profile notes provided)"}`
    )
    .join("\n\n");
  return structured(
    PatternSchema,
    `You are calibrating a hiring screen for Kargo. Compare the hires who are thriving (Exceeds Expectations AND still at Kargo) with the rest. Find what the thriving group has in common that the others lack. The point is something the job spec never asked for.

Rules:
- Name 3-5 signals that can be observed in a CV, written as behaviours or experiences ("ran a field ops team before moving to product"), never as demographics, schools or company brands.
- For each signal, list which thriving hires show it.
- Give 2-4 anti-signals drawn from the weaker outcomes.
- With only 8 hires, say plainly in the summary how confident the pattern can be.
${FAIRNESS}`,
    profiles
  );
}

// ---------------- offline fallback ----------------
// Keyword heuristic so the full flow works without an API key. It is much
// cruder than the model and labelled as such in the UI.

const KEYWORDS: Record<string, RegExp> = {
  pattern_match: /(founding|first (pm|hire|product)|early[- ]stage|ground up|from scratch|field|hands[- ]on|operations)/gi,
  operator_proximity: /(operations|ops|warehouse|field|supply chain|logistics|freight|fleet|dispatch|on[- ]ground|whatsapp|excel|sales|support)/gi,
  ownership: /(0\s*(→|->|to)\s*1|zero to one|launched|founded|built|owned|led the|startup|seed|series a)/gi,
  shipped_outcomes: /(\d+\s?%|\₹|\$|\d+x\b|increased|reduced|grew|saved|revenue|retention|nps)/gi,
  product_craft: /(roadmap|prd|discovery|user research|a\/b|experiment|prioriti[sz]|metrics|analytics|sql|spec)/gi,
  leadership: /(led a team|managed \d+|mentor|head of|strategy|stakeholder|cross[- ]functional|director|senior)/gi,
  domain: /(saas|b2b|logistics|freight|shipping|supply chain|transport|tms|carrier)/gi,
};

function heuristicScore(text: string, pattern: SuccessPattern) {
  const yearsMatch = [...text.matchAll(/(\d{1,2})\+?\s*(?:years|yrs)/gi)].map((m) => +m[1]).filter((n) => n < 40);
  const years = yearsMatch.length ? Math.max(...yearsMatch) : 3;
  const scores = (role: Role) =>
    CRITERIA.map((c) => {
      const hits = text.match(KEYWORDS[c.key]) ?? [];
      let s = Math.min(5, 1 + Math.floor(hits.length / 2));
      if (c.key === "leadership" && role === "SPM" && years < 5) s = Math.max(1, s - 1);
      const sample = [...new Set(hits.map((h) => h.toLowerCase()))].slice(0, 4).join(", ");
      return { key: c.key, score: s, evidence: sample ? `Keyword evidence: ${sample}` : "No evidence in CV" };
    });
  const pm = scores("PM");
  return {
    headline: `${years}+ years experience (heuristic read; add an API key for a real assessment)`,
    years_experience: years,
    pattern_signals_found: pm.find((s) => s.key === "pattern_match")!.score >= 3 ? [pattern.signals[0]?.name ?? "Pattern match"] : [],
    red_flags: [],
    why_ranked: "Scored by keyword heuristic because no ANTHROPIC_API_KEY is set. Treat as a rough sort, not a judgement.",
    pm_scores: pm,
    spm_scores: scores("SPM"),
  };
}

function heuristicDrafts(role: Role, a: Analysis): Drafts {
  const weakest = [...a.by_role[role].criteria].sort((x, y) => x.score - y.score).slice(0, 3);
  return {
    brief: {
      probe_questions: weakest.map(
        (w) => `Walk me through a time you showed ${CRITERIA.find((c) => c.key === w.key)!.label.toLowerCase()}. What was your exact role?`
      ),
      verify_claims: ["Verify the largest metric claimed on the CV and their personal contribution to it."],
    },
    invite: {
      subject: `Kargo · ${ROLE_LABEL[role]}: let's talk`,
      body: `Hi {{first_name}},\n\nThanks for applying for the ${ROLE_LABEL[role]} role at Kargo. Your background stood out and I'd like to meet.\n\nCould you reply with two or three 30-minute slots that work for you this week or next?\n\nBest,\nArjun Mehta\nFounder, Kargo`,
    },
    rejection: {
      subject: `Your application for ${ROLE_LABEL[role]} at Kargo`,
      body: `Hi {{first_name}},\n\nThank you for applying for the ${ROLE_LABEL[role]} role at Kargo and for the time you put into it.\n\nWe've decided not to move forward right now. The role needs a profile that's closer to what our current stage demands. That's a call about fit today, not about your ability.\n\nI'd be glad to hear from you again as Kargo grows.\n\nBest,\nArjun Mehta\nFounder, Kargo`,
    },
  };
}
