-- B33HIVE OS — 0002_time_toggl
--
-- Adds the Toggl <-> project mapping needed for the Time view.
-- Run this whole file in the Supabase SQL editor.
--
-- Mapping is manual and explicit by design: a B33HIVE project is linked to a Toggl
-- project by numeric id from the Time view, never auto-matched by name. A rename in
-- Toggl can then never silently reassign hours (and therefore margin) to the wrong
-- client — an unmatched Toggl project just sits unmatched until linked by hand.

alter table projects
  add column toggl_project_id bigint unique,
  add column toggl_project_name text;

comment on column projects.toggl_project_id is
  'Manually linked from the Time view. Never auto-matched by name.';
comment on column projects.toggl_project_name is
  'Display cache of the Toggl project name, refreshed on sync. Not authoritative.';

-- Raw project id from Toggl, captured at sync time regardless of whether a mapping to
-- a B33HIVE project exists yet. time_entries.project_id (already nullable) only gets
-- set once the operator links the corresponding Toggl project.
alter table time_entries
  add column toggl_project_id bigint;

comment on column time_entries.toggl_project_id is
  'Raw project id from Toggl, captured at sync regardless of mapping state.';

create index time_entries_toggl_project_id_idx on time_entries (toggl_project_id)
  where toggl_project_id is not null;
