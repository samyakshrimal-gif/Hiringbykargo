import { scoreCandidate, draftFollowUps } from "./ai";
import { getPattern } from "./store";
import type { Analysis, Drafts, Role } from "./types";

export async function assess(redacted: string, role: Role): Promise<{ analysis: Analysis; drafts: Drafts }> {
  const pattern = await getPattern();
  const analysis = await scoreCandidate(redacted, role, pattern);
  const drafts = await draftFollowUps(redacted, role, analysis);
  return { analysis, drafts };
}
