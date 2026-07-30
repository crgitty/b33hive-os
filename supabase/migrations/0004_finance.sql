-- B33HIVE OS — 0004_finance
--
-- Adds what the Finance view needs that the schema doesn't already cover.
-- Run this whole file in the Supabase SQL editor.
--
-- "Payables" has no home in the existing schema: expenses are recorded as incurred, with
-- no notion of outstanding-vs-settled. Mirroring the paid_at pattern already used on
-- invoices gives payables a concrete, honest definition: sum of expenses where paid_at
-- is null. Cash on hand and MRR are NOT redefined here — this view reuses the existing
-- cash_snapshots table and the same is_recurring-offer MRR definition Overview already
-- uses, so the two views can never show two different numbers for the same concept.

alter table expenses
  add column paid_at timestamptz null;

comment on column expenses.paid_at is
  'Null means outstanding (a payable). Set means settled. Mirrors invoices.paid_at.';

create index expenses_unpaid_idx on expenses (incurred_at) where paid_at is null;
