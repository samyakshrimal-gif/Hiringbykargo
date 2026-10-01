import type { Role, Verdict, CriterionScore, SuccessPattern, Hire } from "./types";

export interface Criterion {
  key: string;
  label: string;
  description: string;
  weight: Record<Role, number>; // each role sums to 100
}

// The spec describes the role; it doesn't predict success at Kargo. So the
// heaviest weight goes to the pattern extracted from Arjun's thriving hires,
// and the JD-style craft criteria act as a floor, not the ranking signal.
export const CRITERIA: Criterion[] = [
  {
    key: "pattern_match",
    label: "Kargo success pattern",
    description:
      "How strongly the CV shows the signals shared by Kargo's thriving hires (see the success pattern).",
    weight: { PM: 30, SPM: 25 },
  },
  {
    key: "operator_proximity",
    label: "Operator proximity",
    description:
      "Hands-on exposure to messy real-world operations: field teams, supply chain, logistics, non-digital users, WhatsApp-and-spreadsheet workflows.",
    weight: { PM: 15, SPM: 10 },
  },
  {
    key: "ownership",
    label: "Ownership in ambiguity",
    description:
      "Built or ran something with thin structure and resources: 0→1 work, early-stage teams, owning an outcome rather than a task list.",
    weight: { PM: 15, SPM: 15 },
  },
  {
    key: "shipped_outcomes",
    label: "Shipped, measurable outcomes",
    description:
      "Concrete things shipped with numbers attached (adoption, revenue, time saved, error rates), not responsibilities.",
    weight: { PM: 15, SPM: 15 },
  },
  {
    key: "product_craft",
    label: "Product craft",
    description:
      "Discovery, prioritisation, writing specs, working with engineering, using data to decide.",
    weight: { PM: 15, SPM: 10 },
  },
  {
    key: "leadership",
    label: "Scope & leadership",
    description:
      "Owning strategy and roadmap, influencing without authority, mentoring PMs, partnering directly with a founder or exec.",
    weight: { PM: 5, SPM: 20 },
  },
  {
    key: "domain",
    label: "B2B SaaS / logistics context",
    description: "Prior exposure to B2B SaaS, logistics, freight, or supply-chain software.",
    weight: { PM: 5, SPM: 5 },
  },
];

export const EXPERIENCE_BAND: Record<Role, { min: number; max: number }> = {
  PM: { min: 2, max: 6 },
  SPM: { min: 5, max: 12 },
};

export const THRESHOLDS = { advance: 70, review: 50 };

export function weightedTotal(scores: CriterionScore[], role: Role): number {
  let total = 0;
  for (const c of CRITERIA) {
    const s = scores.find((x) => x.key === c.key)?.score ?? 1;
    total += c.weight[role] * ((Math.min(5, Math.max(1, s)) - 1) / 4);
  }
  return Math.round(total);
}

export function verdictFor(total: number): Verdict {
  if (total >= THRESHOLDS.advance) return "advance";
  if (total >= THRESHOLDS.review) return "review";
  return "pass";
}

export const VERDICT_LABEL: Record<Verdict, string> = {
  advance: "Advance",
  review: "Your call",
  pass: "Pass",
};

export const SEED_HIRES: Omit<Hire, "id">[] = [
  { name: "Rohan Desai", role: "Head of Engineering", joined: "Jul 2022", rating: "Exceeds Expectations", still_at_kargo: true, notes: "" },
  { name: "Sunita Krishnamurthy", role: "Operations Lead", joined: "Jan 2023", rating: "Exceeds Expectations", still_at_kargo: true, notes: "" },
  { name: "Vikram Nair", role: "Product Manager", joined: "Jun 2023", rating: "Meets Expectations", still_at_kargo: true, notes: "" },
  { name: "Aditya Shetty", role: "Sales Lead", joined: "Aug 2023", rating: "Exceeds Expectations", still_at_kargo: true, notes: "" },
  { name: "Preetham Rao", role: "Backend Engineer", joined: "Feb 2024", rating: "Below Expectations", still_at_kargo: true, notes: "" },
  { name: "Meghna Tiwari", role: "Customer Success Manager", joined: "Aug 2024", rating: "Exceeds Expectations", still_at_kargo: true, notes: "" },
  { name: "Lavanya Iyer", role: "Product Manager", joined: "Apr 2025", rating: "Exceeds Expectations", still_at_kargo: true, notes: "" },
  { name: "Rahul Bose", role: "Growth & Marketing Lead", joined: "Jun 2025", rating: "Meets Expectations", still_at_kargo: true, notes: "" },
];

// A working hypothesis until real hire profiles are pasted in and the
// pattern is extracted on the Calibration page.
export const DEFAULT_PATTERN: SuccessPattern = {
  summary:
    "Working hypothesis: Kargo's thriving hires were operators before they were strategists. They had done the messy work themselves, close to real users, in under-resourced settings, and they describe impact in concrete numbers.",
  signals: [
    { name: "Did the work before managing it", description: "Hands-on time in operations, sales, support or engineering before moving into a strategic role.", seen_in: [] },
    { name: "Close to messy reality", description: "Worked directly with non-digital users, field teams or offline workflows, not only with dashboards.", seen_in: [] },
    { name: "Built with thin resources", description: "Created something from scratch at an early-stage company or new team, without a playbook.", seen_in: [] },
    { name: "Talks in outcomes", description: "Describes results with specific numbers and their own role in them.", seen_in: [] },
  ],
  anti_signals: [
    "Big-brand pedigree with no evidence of hands-on work",
    "Responsibilities listed instead of outcomes",
    "Frequent short stints with no clear ownership arc",
  ],
  source: "default",
  updated_at: new Date(0).toISOString(),
};
