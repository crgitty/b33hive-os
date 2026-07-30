-- B33HIVE OS — 0005_intelligence
--
-- Adds pilot decision outcomes (Field Manual, not in the original schema) and the two
-- Field Manual rules for pilots: at most 2 active pilots at a time, and 3+ paying
-- customers required before a decision can be recorded. Run this whole file in the
-- Supabase SQL editor.
--
-- Safe only because no pilot rows exist yet (verified before writing this) — no
-- Intelligence UI has existed to create one. Do NOT run this against a pilots table
-- that already has real rows without migrating their status values first; the
-- drop-and-recreate below discards whatever is in the status column.

-- The original placeholder status (planned/running/continued/killed) folded the pilot's
-- lifecycle and its decision outcome into one enum. The Field Manual's four outcomes
-- (below) don't map onto "continued"/"killed", so status now only tracks the lifecycle
-- — planned, running, or decided — and the outcome lives in its own column.
alter table pilots drop column status;
drop type pilot_status;
create type pilot_status as enum ('planned', 'running', 'decided');
alter table pilots add column status pilot_status not null default 'planned';

-- Field Manual: pilot decision outcomes are fixed to exactly these four.
create type pilot_decision as enum (
  'remain_service',
  'become_product',
  'form_venture',
  'abandon'
);

alter table pilots
  add column decision pilot_decision null,
  add column decided_at timestamptz null;

comment on column pilots.decision is
  'Field Manual: fixed to these four outcomes. Null until status = decided.';

-- Field Manual rule: a pilot needs 3+ paying customers before a decision of any kind
-- (including abandoning it) can be recorded. Data-layer enforcement, not a disabled
-- button — see also the pilots_enforce_max_active trigger below for the other rule.
alter table pilots
  add constraint pilots_decision_requires_customers
  check (decision is null or customer_count >= 3);

comment on constraint pilots_decision_requires_customers on pilots is
  'Field Manual rule: 3+ paying customers required before a decision can be recorded.';

-- decision and status = 'decided' must travel together, or the two could drift apart
-- (a decision with no matching status, or a "decided" pilot with no recorded outcome).
alter table pilots
  add constraint pilots_decision_matches_status
  check ((status = 'decided') = (decision is not null));

-- Field Manual rule: at most 2 active pilots (planned or running) at any time. A cross-
-- row count can't be expressed as a CHECK constraint, hence the trigger.
create or replace function enforce_max_active_pilots()
returns trigger
language plpgsql
as $$
declare
  active_count int;
begin
  if new.status in ('planned', 'running') then
    select count(*) into active_count
    from pilots
    where status in ('planned', 'running')
      and id <> new.id;

    if active_count >= 2 then
      raise exception 'Field Manual rule: at most 2 active pilots at a time (already % active)', active_count
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

comment on function enforce_max_active_pilots is
  'Field Manual rule: at most 2 active (planned or running) pilots at a time.';

create trigger pilots_enforce_max_active
before insert or update of status on pilots
for each row
execute function enforce_max_active_pilots();
