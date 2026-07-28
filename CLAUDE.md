@AGENTS.md

# B33HIVE OS

Internal operating dashboard for B33HIVE, a creative and strategic agency in Park City, UT.
Single operator (founder). Replaces a scattered stack of Asana, spreadsheets, and memory.

**One app. One database. Six views.** A deal becomes a project, becomes tracked hours,
becomes a margin number, becomes a gate-clearance row. Same records, different lenses.
That continuity is the entire point — do not build these as isolated features.

---

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Supabase (Postgres) — connection string in `.env.local`, never committed
- Deployed to Vercel via GitHub (later — local-first for now)

No auth for now. Single user, local machine. Do not add login screens, role checks,
or multi-tenancy until explicitly asked.

### RLS is not enabled — blocker for deploy

Row Level Security is **off on every table**. The publishable key ships to the browser,
so today anyone holding it can read and write the whole database. That is fine only
because this runs locally for one operator.

**RLS must be enabled, with policies, before the first Vercel deploy.** Not after,
not "once there's real data in it" — the moment the app is reachable at a public URL.
Enabling RLS without policies denies all access and breaks the app, so auth and policies
land together, in that order: auth first, then policies, then deploy. A starting-point
migration is sketched at the bottom of `supabase/migrations/0001_init.sql`.

---

## Non-negotiable rules

These come from the B33HIVE Field Manual. Enforce them in the **data layer**, not just the UI.
A rule that lives only in a form validation is a rule that gets skipped under deadline pressure.

1. **QC gate.** A deliverable cannot be marked client-visible without
   `internal_qc_approved_at` set. Enforce with a DB constraint or a check in the
   mutation layer — not a disabled button.

2. **Permission gate.** A case study cannot be marked `published` unless
   `permission_status = 'confirmed'`. Same enforcement standard.

3. **Pipeline stages are fixed.** Contacted → Qualified → Proposal Sent → Negotiation →
   Won → Lost. Not user-configurable. Deals auto-flag stale after 14 days in Contacted,
   10 days in Proposal Sent, 21 days silent anywhere → Lost.

4. **Won deals create projects.** Moving a deal to Won creates a project record
   automatically. Do not make this a manual second step.

5. **Every number displayed must be real or explicitly empty.** No demo data, no
   seeded fake records, no placeholder revenue figures rendered as if actual. Empty
   state is the correct state until real data exists.

---

## The three offers

Price bands are ILLUSTRATIVE PLACEHOLDERS pending real data. Store them as editable
config, never hardcode in components.

| Offer | Timeline | Price band | Est. hours | Target margin |
|---|---|---|---|---|
| Growth Foundation | 4–6 wks | $8,000–15,000 | 60–90 | 55% |
| Content & Reputation Engine | monthly, 3-mo min | $2,500–5,000/mo | 15–25/mo | 50% |
| Operating Systems Sprint | 3–4 wks | $5,000–10,000 | 40–60 | 50% |

---

## Data model

Start here. Add fields as needed, but keep these relationships intact.

```
contacts        id, name, org, role, source, segment, email, phone,
                last_contact_at, next_action, next_action_due, created_at

deals           id, contact_id, offer_type, value, stage, stage_entered_at,
                loss_reason, created_at

activities      id, contact_id, deal_id, type, note, occurred_at

projects        id, deal_id, contact_id, offer_type, status, started_at, closed_at

phases          id, project_id, name, sequence, gate_artifact_url, approved_at

deliverables    id, project_id, phase_id, name, internal_qc_approved_at,
                client_visible_at, revision_count

invoices        id, project_id, amount, issued_at, due_at, paid_at, status

expenses        id, description, amount, category, incurred_at

time_entries    id, project_id, toggl_id, hours, entry_date, description
                (read-only mirror of Toggl — never the source of truth)

problems        id, org_type, description, frequency_score, pain_score,
                current_workaround, current_spend, purchasing_authority,
                productization_potential, logged_at
                -> combined_score = frequency_score * pain_score (computed)
                -> flag when combined_score >= 12

pilots          id, problem_id, customer_count, status, launched_at, decision_due_at
                -> decision_due_at = launched_at + 90 days

case_studies    id, project_id, problem, baseline, work_performed, outcome,
                quote, permission_status, industry_tag, published_at

decisions       id, decision, rationale, expected_outcome, decided_at, review_at
```

---

## The six views

**Overview** — the pulse screen. Opens first. Cash on hand, weeks runway, pipeline value,
MRR across the top. Below: pipeline stage counts, active projects, hours this week,
receivables 30+, problems logged. Bottom: Gate 1 tracker (5 conditions, live-computed,
never a manual checkbox).

**Pipeline** — kanban across the six fixed stages. Drag to advance. Contact detail with
activity timeline. Stale deals surfaced automatically, not hunted for.

**Projects** — created from Won deals. Phases as columns. QC gate enforced before
client-visible. Read-only client status view per project.

**Time** — read-only mirror of Toggl via API. Hours grouped by project, compared against
the offer's estimated hours. Feeds margin calculation. Never edited in this app.

**Finance** — weekly cash report is the main view: cash on hand, receivables aged
(0–30 / 31–60 / 61+), payables, weeks of runway, MRR. Margin per offer computed from
time_entries against project value. Receivables follow-up queue with Day 16 / 21 / 30
escalation flags.

**Intelligence** — problem log sorted by combined score, threshold auto-flagged. Pilot
tracker with the 90-day decision clock visible and impossible to ignore.

---

## Gate 1 tracker

Five conditions, each a live query — never a manual checkbox:

1. Six months of stable revenue
2. Positive operating cash flow
3. Cash reserve ≥ 3 months expenses
4. No single client > 30% of trailing-90-day revenue
5. Recurring revenue ≥ 40% of total

All five must clear before venture activity is authorized. Display current status honestly,
including "not started."

---

## Build order

**One view at a time. Fully working before starting the next.** Do not scaffold all six.

1. Database schema + Overview shell (empty states, correct layout)
2. Pipeline
3. Projects
4. Finance
5. Time (Toggl API)
6. Intelligence

Commit after each view works.

---

## Conventions

- Dark UI. Near-black background (`#0A0A0A`), gold accent (`#D4AF37`), off-white text
  (`#F2EFE8`). Gold is punctuation — accents, key figures, active states. Never large fills.
- Sentence case. No ALL CAPS labels.
- Server components by default; client components only where interactivity requires it.
- Dates stored UTC, displayed local.
- Money stored as integer cents. Never floats.
- Round every displayed number.

---

## Do not build

- Authentication or user roles
- Email sending
- Payment processing
- Native mobile app
- Notification infrastructure
- Demo or seed data

These come later, if ever. Ask before adding any of them.
