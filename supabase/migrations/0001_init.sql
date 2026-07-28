-- B33HIVE OS — 0001_init
--
-- Run this whole file in the Supabase SQL editor (Dashboard → SQL Editor → New query).
-- It is idempotent enough to re-run on a fresh project, but it is NOT a down migration:
-- it creates types, tables, triggers and views from empty.
--
-- Conventions enforced here:
--   * Money is stored as integer cents in bigint columns suffixed `_cents`. Never floats.
--   * All timestamps are timestamptz, stored UTC, displayed local by the app.
--   * The Field Manual rules live in this file as constraints and triggers, not in form
--     validation. A rule that only exists in the UI is a rule that gets skipped.
--
-- !! RLS IS NOT ENABLED. See the block at the bottom of this file. This schema is safe
-- !! only on a local, single-operator setup. It must not reach a public Vercel deploy
-- !! as-is — the publishable key is in the browser and every table is world-readable
-- !! and world-writable until RLS policies exist.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enumerated types
-- ---------------------------------------------------------------------------

-- Rule 3: pipeline stages are fixed and not user-configurable. An enum makes adding a
-- stage a migration, which is the point.
create type deal_stage as enum (
  'contacted',
  'qualified',
  'proposal_sent',
  'negotiation',
  'won',
  'lost'
);

create type activity_type as enum (
  'call',
  'email',
  'meeting',
  'proposal',
  'note'
);

create type project_status as enum (
  'active',
  'on_hold',
  'complete',
  'cancelled'
);

create type invoice_status as enum (
  'draft',
  'sent',
  'paid',
  'void'
);

create type permission_status as enum (
  'not_requested',
  'requested',
  'confirmed',
  'declined'
);

create type pilot_status as enum (
  'planned',
  'running',
  'continued',
  'killed'
);

-- ---------------------------------------------------------------------------
-- offers — editable config, not hardcoded in components
-- ---------------------------------------------------------------------------
-- The three offers are config rows so the founder can edit price bands, hour estimates
-- and target margins without a deploy. `price_is_placeholder` exists so the UI can label
-- these numbers honestly: the bands below are illustrative pending real data (rule 5).

create table offers (
  slug                  text primary key,
  name                  text        not null,
  timeline_label        text        not null,
  price_min_cents       bigint      not null check (price_min_cents >= 0),
  price_max_cents       bigint      not null check (price_max_cents >= price_min_cents),
  est_hours_min         numeric(6,2) not null check (est_hours_min >= 0),
  est_hours_max         numeric(6,2) not null check (est_hours_max >= est_hours_min),
  target_margin         numeric(4,3) not null check (target_margin > 0 and target_margin < 1),
  is_recurring          boolean     not null default false,
  min_term_months       int         null check (min_term_months is null or min_term_months > 0),
  price_is_placeholder  boolean     not null default true,
  is_active             boolean     not null default true,
  sort_order            int         not null default 0
);

comment on table offers is
  'Editable offer config. Price bands are illustrative placeholders until real deal data exists — see price_is_placeholder.';
comment on column offers.est_hours_min is
  'For recurring offers these are per-month figures.';

insert into offers (slug, name, timeline_label, price_min_cents, price_max_cents,
                    est_hours_min, est_hours_max, target_margin, is_recurring,
                    min_term_months, sort_order)
values
  ('growth_foundation', 'Growth Foundation', '4–6 weeks',
    800000, 1500000, 60, 90, 0.550, false, null, 1),
  ('content_reputation_engine', 'Content & Reputation Engine', 'Monthly, 3-month minimum',
    250000, 500000, 15, 25, 0.500, true, 3, 2),
  ('operating_systems_sprint', 'Operating Systems Sprint', '3–4 weeks',
    500000, 1000000, 40, 60, 0.500, false, null, 3)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- contacts
-- ---------------------------------------------------------------------------

create table contacts (
  id               uuid primary key default gen_random_uuid(),
  name             text        not null check (length(btrim(name)) > 0),
  org              text        null,
  role             text        null,
  source           text        null,
  segment          text        null,
  email            text        null,
  phone            text        null,
  last_contact_at  timestamptz null,
  next_action      text        null,
  next_action_due  timestamptz null,
  created_at       timestamptz not null default now()
);

comment on column contacts.last_contact_at is
  'Maintained by the activities trigger. Do not set by hand — log an activity instead.';

create index contacts_next_action_due_idx on contacts (next_action_due)
  where next_action_due is not null;

-- ---------------------------------------------------------------------------
-- deals
-- ---------------------------------------------------------------------------

create table deals (
  id               uuid primary key default gen_random_uuid(),
  contact_id       uuid        not null references contacts (id) on delete restrict,
  offer_type       text        not null references offers (slug) on update cascade,
  value_cents      bigint      not null default 0 check (value_cents >= 0),
  stage            deal_stage  not null default 'contacted',
  stage_entered_at timestamptz not null default now(),
  loss_reason      text        null,
  created_at       timestamptz not null default now(),

  -- A loss reason on a live deal is a data-entry mistake; capturing why we lost is only
  -- meaningful on lost deals.
  constraint deals_loss_reason_only_when_lost
    check (loss_reason is null or stage = 'lost')
);

comment on column deals.value_cents is 'Integer cents. Total contract value, or monthly value for recurring offers.';
comment on column deals.stage_entered_at is
  'Maintained by trigger on stage change. Drives the rule 3 staleness thresholds.';

create index deals_contact_id_idx on deals (contact_id);
create index deals_stage_idx on deals (stage);
create index deals_stage_entered_at_idx on deals (stage_entered_at);

-- ---------------------------------------------------------------------------
-- activities
-- ---------------------------------------------------------------------------

create table activities (
  id          uuid          primary key default gen_random_uuid(),
  contact_id  uuid          not null references contacts (id) on delete cascade,
  deal_id     uuid          null references deals (id) on delete set null,
  type        activity_type not null,
  note        text          null,
  occurred_at timestamptz   not null default now()
);

create index activities_contact_occurred_idx on activities (contact_id, occurred_at desc);
create index activities_deal_occurred_idx on activities (deal_id, occurred_at desc)
  where deal_id is not null;

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------

create table projects (
  id          uuid           primary key default gen_random_uuid(),
  -- Unique: one Won deal produces exactly one project (rule 4).
  deal_id     uuid           null unique references deals (id) on delete set null,
  contact_id  uuid           not null references contacts (id) on delete restrict,
  offer_type  text           not null references offers (slug) on update cascade,
  status      project_status not null default 'active',
  started_at  timestamptz    not null default now(),
  closed_at   timestamptz    null,

  constraint projects_closed_after_started
    check (closed_at is null or closed_at >= started_at)
);

create index projects_status_idx on projects (status);
create index projects_contact_id_idx on projects (contact_id);

-- ---------------------------------------------------------------------------
-- phases
-- ---------------------------------------------------------------------------

create table phases (
  id                uuid        primary key default gen_random_uuid(),
  project_id        uuid        not null references projects (id) on delete cascade,
  name              text        not null check (length(btrim(name)) > 0),
  sequence          int         not null check (sequence > 0),
  gate_artifact_url text        null,
  approved_at       timestamptz null,

  unique (project_id, sequence)
);

create index phases_project_id_idx on phases (project_id, sequence);

-- ---------------------------------------------------------------------------
-- deliverables — rule 1, the QC gate
-- ---------------------------------------------------------------------------

create table deliverables (
  id                      uuid        primary key default gen_random_uuid(),
  project_id              uuid        not null references projects (id) on delete cascade,
  phase_id                uuid        null references phases (id) on delete set null,
  name                    text        not null check (length(btrim(name)) > 0),
  internal_qc_approved_at timestamptz null,
  client_visible_at       timestamptz null,
  revision_count          int         not null default 0 check (revision_count >= 0),

  -- Rule 1: a deliverable cannot be client-visible without internal QC approval. This
  -- also blocks the reverse move — you cannot clear QC approval on something already
  -- released, because that would leave a client-visible row with no approval behind it.
  constraint deliverables_qc_gate
    check (client_visible_at is null or internal_qc_approved_at is not null),

  -- QC has to happen before release, not be backdated after it.
  constraint deliverables_qc_precedes_release
    check (client_visible_at is null or client_visible_at >= internal_qc_approved_at)
);

comment on constraint deliverables_qc_gate on deliverables is
  'Field Manual rule 1. Do not drop this to unblock a release.';

create index deliverables_project_id_idx on deliverables (project_id);
create index deliverables_phase_id_idx on deliverables (phase_id) where phase_id is not null;

-- ---------------------------------------------------------------------------
-- invoices
-- ---------------------------------------------------------------------------

create table invoices (
  id           uuid           primary key default gen_random_uuid(),
  project_id   uuid           not null references projects (id) on delete restrict,
  amount_cents bigint         not null check (amount_cents > 0),
  issued_at    timestamptz    null,
  due_at       timestamptz    null,
  paid_at      timestamptz    null,
  status       invoice_status not null default 'draft',

  -- paid_at and status='paid' are two views of one fact; keep them from drifting apart.
  constraint invoices_paid_consistency
    check ((status = 'paid') = (paid_at is not null)),
  constraint invoices_issued_before_due
    check (issued_at is null or due_at is null or due_at >= issued_at),
  -- Anything sent or paid has actually gone out the door.
  constraint invoices_issued_when_sent
    check (status in ('draft', 'void') or issued_at is not null)
);

comment on column invoices.status is
  'Overdue is not a stored status — it is computed from due_at against now(). Receivables aging and the Day 16/21/30 escalation flags derive from issued_at.';

create index invoices_project_id_idx on invoices (project_id);
create index invoices_outstanding_idx on invoices (due_at) where paid_at is null;

-- ---------------------------------------------------------------------------
-- expenses
-- ---------------------------------------------------------------------------

create table expenses (
  id           uuid        primary key default gen_random_uuid(),
  description  text        not null check (length(btrim(description)) > 0),
  amount_cents bigint      not null check (amount_cents > 0),
  category     text        null,
  incurred_at  timestamptz not null default now(),
  -- Runway and the Gate 1 cash-reserve test need to know which costs repeat.
  is_recurring boolean     not null default false
);

create index expenses_incurred_at_idx on expenses (incurred_at desc);

-- ---------------------------------------------------------------------------
-- cash_snapshots — the source for "cash on hand" and weeks of runway
-- ---------------------------------------------------------------------------
-- Not in the original data model, but Overview and Finance both display cash on hand and
-- nothing else in the schema can produce it. Manually entered point-in-time balance; the
-- app reads the most recent row and shows its as_of date so the number is never presented
-- as fresher than it is.

create table cash_snapshots (
  id            uuid        primary key default gen_random_uuid(),
  balance_cents bigint      not null check (balance_cents >= 0),
  as_of         timestamptz not null default now(),
  note          text        null
);

create index cash_snapshots_as_of_idx on cash_snapshots (as_of desc);

-- ---------------------------------------------------------------------------
-- time_entries — read-only mirror of Toggl
-- ---------------------------------------------------------------------------
-- Never the source of truth and never edited in this app. toggl_id is unique so the sync
-- can upsert idempotently.

create table time_entries (
  id          uuid         primary key default gen_random_uuid(),
  project_id  uuid         null references projects (id) on delete set null,
  toggl_id    bigint       not null unique,
  hours       numeric(6,2) not null check (hours >= 0),
  entry_date  date         not null,
  description text         null,
  synced_at   timestamptz  not null default now()
);

comment on table time_entries is
  'Read-only mirror of Toggl. Written only by the sync job; never edited in the app.';

create index time_entries_project_date_idx on time_entries (project_id, entry_date);

-- ---------------------------------------------------------------------------
-- problems
-- ---------------------------------------------------------------------------

create table problems (
  id                       uuid        primary key default gen_random_uuid(),
  org_type                 text        not null,
  description              text        not null check (length(btrim(description)) > 0),
  frequency_score          smallint    not null check (frequency_score between 1 and 5),
  pain_score               smallint    not null check (pain_score between 1 and 5),
  current_workaround       text        null,
  current_spend_cents      bigint      null check (current_spend_cents is null or current_spend_cents >= 0),
  purchasing_authority     boolean     null,
  productization_potential smallint    null check (productization_potential is null
                                                   or productization_potential between 1 and 5),
  logged_at                timestamptz not null default now(),

  combined_score int generated always as (frequency_score * pain_score) stored,
  -- Threshold flag is computed, never a manual checkbox.
  is_flagged boolean generated always as (frequency_score * pain_score >= 12) stored
);

create index problems_combined_score_idx on problems (combined_score desc, logged_at desc);

-- ---------------------------------------------------------------------------
-- pilots
-- ---------------------------------------------------------------------------

create table pilots (
  id              uuid         primary key default gen_random_uuid(),
  problem_id      uuid         not null references problems (id) on delete restrict,
  customer_count  int          not null default 0 check (customer_count >= 0),
  status          pilot_status not null default 'planned',
  launched_at     timestamptz  null,
  -- Derived: launched_at + 90 days, set by trigger. Cannot be a generated column because
  -- timestamptz + interval is not immutable.
  decision_due_at timestamptz  null
);

comment on column pilots.decision_due_at is
  'Always launched_at + 90 days, enforced by trigger. The 90-day decision clock is not negotiable by hand.';

create index pilots_decision_due_at_idx on pilots (decision_due_at)
  where decision_due_at is not null;

-- ---------------------------------------------------------------------------
-- case_studies — rule 2, the permission gate
-- ---------------------------------------------------------------------------

create table case_studies (
  id                uuid              primary key default gen_random_uuid(),
  project_id        uuid              not null references projects (id) on delete restrict,
  problem           text              null,
  baseline          text              null,
  work_performed    text              null,
  outcome           text              null,
  quote             text              null,
  permission_status permission_status not null default 'not_requested',
  industry_tag      text              null,
  published_at      timestamptz       null,

  -- Rule 2: published requires confirmed permission. Also blocks walking permission back
  -- to anything other than confirmed while the study is still published.
  constraint case_studies_permission_gate
    check (published_at is null or permission_status = 'confirmed')
);

comment on constraint case_studies_permission_gate on case_studies is
  'Field Manual rule 2. Unpublish first if permission is withdrawn.';

create index case_studies_project_id_idx on case_studies (project_id);

-- ---------------------------------------------------------------------------
-- decisions
-- ---------------------------------------------------------------------------

create table decisions (
  id               uuid        primary key default gen_random_uuid(),
  decision         text        not null check (length(btrim(decision)) > 0),
  rationale        text        null,
  expected_outcome text        null,
  decided_at       timestamptz not null default now(),
  review_at        timestamptz null,

  constraint decisions_review_after_decided
    check (review_at is null or review_at >= decided_at)
);

create index decisions_review_at_idx on decisions (review_at) where review_at is not null;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Stage clock. Any stage change resets stage_entered_at, which is what the staleness
-- thresholds in rule 3 measure against.
create or replace function set_stage_entered_at()
returns trigger
language plpgsql
as $$
begin
  if new.stage is distinct from old.stage then
    new.stage_entered_at := now();
    -- Moving a deal back out of Lost should not leave a stale loss reason behind.
    if new.stage <> 'lost' then
      new.loss_reason := null;
    end if;
  end if;
  return new;
end;
$$;

create trigger deals_set_stage_entered_at
before update on deals
for each row
execute function set_stage_entered_at();

-- Rule 4: moving a deal to Won creates the project. Not a manual second step, and not
-- something the UI can forget to do.
create or replace function create_project_from_won_deal()
returns trigger
language plpgsql
as $$
begin
  if new.stage = 'won' and (tg_op = 'INSERT' or old.stage is distinct from 'won') then
    insert into projects (deal_id, contact_id, offer_type, status, started_at)
    values (new.id, new.contact_id, new.offer_type, 'active', now())
    on conflict (deal_id) do nothing;
  end if;
  return null;
end;
$$;

create trigger deals_won_creates_project
after insert or update of stage on deals
for each row
execute function create_project_from_won_deal();

-- Let an activity be logged against a deal without restating the contact.
create or replace function fill_activity_contact()
returns trigger
language plpgsql
as $$
begin
  if new.contact_id is null and new.deal_id is not null then
    select d.contact_id into new.contact_id from deals d where d.id = new.deal_id;
  end if;
  return new;
end;
$$;

create trigger activities_fill_contact
before insert on activities
for each row
execute function fill_activity_contact();

-- contacts.last_contact_at is derived from activity, so "21 days silent" is measured
-- against something that cannot be gamed by editing a field.
create or replace function touch_contact_last_contact_at()
returns trigger
language plpgsql
as $$
begin
  update contacts
     set last_contact_at = greatest(coalesce(last_contact_at, new.occurred_at), new.occurred_at)
   where id = new.contact_id;
  return null;
end;
$$;

create trigger activities_touch_contact
after insert or update of occurred_at, contact_id on activities
for each row
execute function touch_contact_last_contact_at();

-- The 90-day pilot decision clock, always derived from launch.
create or replace function set_pilot_decision_due_at()
returns trigger
language plpgsql
as $$
begin
  new.decision_due_at := case
    when new.launched_at is null then null
    else new.launched_at + interval '90 days'
  end;
  return new;
end;
$$;

create trigger pilots_set_decision_due_at
before insert or update of launched_at on pilots
for each row
execute function set_pilot_decision_due_at();

-- ---------------------------------------------------------------------------
-- Views
-- ---------------------------------------------------------------------------

-- Rule 3 staleness, computed in one place rather than re-derived per component.
-- Thresholds: 14 days in Contacted, 10 days in Proposal Sent, 21 days with no activity
-- in any open stage.
--
-- NOTE: the 21-day rule flags a deal as a Lost candidate; it does not write the stage.
-- Auto-mutating a deal to Lost would destroy the operator's own judgement without asking.
-- The Pipeline view surfaces these; advancing to Lost stays a deliberate act.
create view deals_pipeline
with (security_invoker = on)
as
select
  d.id,
  d.contact_id,
  c.name  as contact_name,
  c.org   as contact_org,
  d.offer_type,
  o.name  as offer_name,
  d.value_cents,
  d.stage,
  d.stage_entered_at,
  d.loss_reason,
  d.created_at,
  extract(day from now() - d.stage_entered_at)::int as days_in_stage,
  la.last_activity_at,
  case
    when la.last_activity_at is null then null
    else extract(day from now() - la.last_activity_at)::int
  end as days_silent,
  case
    when d.stage in ('won', 'lost') then null
    when coalesce(la.last_activity_at, d.created_at) < now() - interval '21 days'
      then 'silent_21d'
    when d.stage = 'contacted' and d.stage_entered_at < now() - interval '14 days'
      then 'contacted_14d'
    when d.stage = 'proposal_sent' and d.stage_entered_at < now() - interval '10 days'
      then 'proposal_sent_10d'
  end as stale_reason,
  (
    d.stage not in ('won', 'lost')
    and coalesce(la.last_activity_at, d.created_at) < now() - interval '21 days'
  ) as lost_candidate
from deals d
join contacts c on c.id = d.contact_id
join offers   o on o.slug = d.offer_type
left join lateral (
  select max(a.occurred_at) as last_activity_at
  from activities a
  where a.contact_id = d.contact_id
    and (a.deal_id = d.id or a.deal_id is null)
) la on true;

comment on view deals_pipeline is
  'Deals with rule 3 staleness computed live. stale_reason is null for healthy, Won and Lost deals.';

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY — NOT YET ENABLED
-- ---------------------------------------------------------------------------
--
-- Every table above is currently readable and writable by anyone holding the publishable
-- key, which ships to the browser. That is acceptable only while this runs locally for a
-- single operator with no auth.
--
-- BEFORE ANY VERCEL DEPLOY: enable RLS on every table and add policies. There is no auth
-- in this app yet, so enabling RLS without policies would deny all access and break the
-- app — auth and policies land together, in that order.
--
-- Starting point for that migration:
--
--   alter table offers          enable row level security;
--   alter table contacts        enable row level security;
--   alter table deals           enable row level security;
--   alter table activities      enable row level security;
--   alter table projects        enable row level security;
--   alter table phases          enable row level security;
--   alter table deliverables    enable row level security;
--   alter table invoices        enable row level security;
--   alter table expenses        enable row level security;
--   alter table cash_snapshots  enable row level security;
--   alter table time_entries    enable row level security;
--   alter table problems        enable row level security;
--   alter table pilots          enable row level security;
--   alter table case_studies    enable row level security;
--   alter table decisions       enable row level security;
--
-- ...then one policy per table, e.g.:
--
--   create policy "operator full access" on contacts
--     for all to authenticated using (true) with check (true);
--
-- The deals_pipeline view is declared security_invoker, so it will respect the policies
-- on its underlying tables once they exist rather than bypassing them.
