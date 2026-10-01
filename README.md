# Kargo Shortlist

A hiring tool for Arjun Mehta (MESA Case 2: *Arjun and the Hiring Backlog*). It ranks Product Manager and Senior Product Manager CVs by how closely they match **Kargo's thriving past hires**, not the job spec. For each candidate it gives Arjun enough to decide, and it sends the right email the moment he does.

> The system recommends. Arjun decides. That decision is the last thing he touches.

## How it maps to the components map

| Stage | Where it happens |
|---|---|
| **Trigger**: founder uploads CVs and picks PM / SPM | `/upload`. Bulk drop, processed 3 at a time, one request per CV so a big batch never times out |
| **Input**: CV file and the selected role | `app/api/candidates/route.ts` takes PDF, DOCX or TXT |
| **Context**: extract and strip personal details | `lib/extract.ts` removes name, email, phone, links, DOB/gender/address lines. The AI only ever sees the redacted text; you can view it on each candidate page |
| **Processing**: score against both PM and SPM rubrics | `lib/rubric.ts` has 7 weighted criteria per role. The heaviest weight is the success pattern; JD-style craft criteria act as a floor |
| **AI**: interview brief and personalised emails | `lib/ai.ts` uses Claude structured outputs: scores with evidence, probe questions, plus *both* an invite and a rejection draft |
| **Output**: ranked dashboard and one-click send | `/` ranked shortlist, `/candidates/[id]` decision panel. Advance sends the invite, Pass sends the rejection, Hold sends nothing. A one-line reason is required and stored |

There are two additions the brief calls for:

- **`/calibration`**: paste the 8 profiles from `hires/` and click *Extract pattern*. Claude compares the thriving hires (Exceeds and still at Kargo) with the rest and names the CV-observable signals they share. That pattern feeds every score. Until you extract it, a clearly labelled working hypothesis is used instead.
- **`/log`**: every decision, the system's recommendation, Arjun's reason, and whether the candidate heard back. This replaces "decisions exist only in his head".

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in whatever keys you have; everything is optional locally
npm run dev
```

With no keys at all it still runs end to end: keyword scoring, local JSON storage and simulated emails. The sidebar shows which mode each part is in.

## Deploy (GitHub → Vercel + Supabase + Resend)

1. **Supabase**: create a project, open the SQL editor and run `supabase/schema.sql`. Copy the project URL and the `service_role` key (Settings → API).
2. **Resend**: create an API key. Leave `RESEND_FROM` as `onboarding@resend.dev` and set `EMAIL_TEST_RECIPIENT` to your own email until you verify a domain.
3. **Anthropic**: create an API key at console.anthropic.com.
4. **Vercel**: import this GitHub repo and add the env vars from `.env.example`, **including `APP_PASSWORD`**. Deploy.

## Fairness guardrails

- Personal details are redacted before any AI call. Contact details are stored only for sending email.
- The prompts forbid using gender, age, religion, caste, location, or school/employer prestige as signals.
- Missing evidence scores low and is shown as "No evidence in CV". The model doesn't fill gaps generously.
- Experience bands are shown as context and never auto-reject anyone.
- Nothing is sent without a human decision.
