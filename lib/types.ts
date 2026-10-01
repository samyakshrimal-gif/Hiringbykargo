export type Role = "PM" | "SPM";
export type Verdict = "advance" | "review" | "pass";
export type Decision = "advance" | "pass" | "hold";

export const ROLE_LABEL: Record<Role, string> = {
  PM: "Product Manager",
  SPM: "Senior Product Manager",
};

export interface CriterionScore {
  key: string;
  score: number; // 1-5
  evidence: string;
}

export interface RoleAssessment {
  criteria: CriterionScore[];
  total: number; // 0-100, weighted
  verdict: Verdict;
}

export interface Analysis {
  headline: string; // one-line who-they-are, no PII
  years_experience: number;
  experience_fit: string;
  pattern_signals_found: string[];
  red_flags: string[];
  why_ranked: string;
  by_role: Record<Role, RoleAssessment>;
  best_fit_role: Role;
  scored_by: "gemini" | "claude" | "heuristic";
}

export interface Brief {
  probe_questions: string[];
  verify_claims: string[];
}

export interface EmailDraft {
  subject: string;
  body: string; // may contain {{first_name}}
}

export interface Drafts {
  brief: Brief;
  invite: EmailDraft;
  rejection: EmailDraft;
}

export interface Candidate {
  id: string;
  created_at: string;
  role: Role;
  file_name: string;
  name: string;
  email: string | null;
  phone: string | null;
  redacted_text: string;
  redactions: number;
  status: "scored" | "error";
  error: string | null;
  analysis: Analysis | null;
  drafts: Drafts | null;
  decision: Decision | null;
  decision_note: string | null;
  decided_at: string | null;
  email_status: "sent" | "simulated" | "failed" | null;
  email_sent_at: string | null;
  email_error: string | null;
}

export interface Hire {
  id: string;
  name: string;
  role: string;
  joined: string;
  rating: "Exceeds Expectations" | "Meets Expectations" | "Below Expectations";
  still_at_kargo: boolean;
  notes: string;
}

export interface PatternSignal {
  name: string;
  description: string;
  seen_in: string[];
}

export interface SuccessPattern {
  summary: string;
  signals: PatternSignal[];
  anti_signals: string[];
  source: "default" | "extracted";
  updated_at: string;
}
