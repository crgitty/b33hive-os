-- B33HIVE OS — 0003_time_entries_toggl_name
--
-- 0002 added toggl_project_name to projects but missed it on time_entries, which the
-- sync needs to display unmatched Toggl projects by name before they're linked.

alter table time_entries
  add column toggl_project_name text;

comment on column time_entries.toggl_project_name is
  'Display cache of the Toggl project name at sync time, used for unmatched entries.';
