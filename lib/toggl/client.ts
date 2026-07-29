// Thin client for the Toggl Track API (v9). Server-only: reads TOGGL_API_TOKEN, which
// must never be exposed with a NEXT_PUBLIC_ prefix. Toggl is always the source of truth —
// nothing here writes back to Toggl.

const TOGGL_BASE = "https://api.track.toggl.com/api/v9";

function authHeader(): string {
  const token = process.env.TOGGL_API_TOKEN;
  if (!token) {
    throw new Error(
      "TOGGL_API_TOKEN is not set. Add it to .env.local (server-only, no NEXT_PUBLIC_ prefix).",
    );
  }
  const encoded = Buffer.from(`${token}:api_token`).toString("base64");
  return `Basic ${encoded}`;
}

async function togglFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${TOGGL_BASE}${path}`, {
    headers: { Authorization: authHeader() },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Toggl API error ${res.status}: ${body}`);
  }
  return res.json();
}

export interface TogglTimeEntry {
  id: number;
  project_id: number | null;
  workspace_id: number;
  description: string | null;
  start: string;
  stop: string | null;
  duration: number;
  server_deleted_at?: string | null;
}

export interface TogglProject {
  id: number;
  workspace_id: number;
  name: string;
}

// Toggl rejects `since` older than 3 months (400 "Since cannot be older than 3
// months"). There is no way to pull full history from this endpoint — older entries
// that haven't been touched since fall outside every sync's window. 89 days leaves a
// day of margin against Toggl's own "3 months" boundary.
const MAX_LOOKBACK_SECONDS = 89 * 24 * 60 * 60;

/** `since` filters by last-modified, not start date, so this also picks up edits and
 * deletions made in Toggl after the original sync — not just newly created entries. */
export async function getTogglTimeEntries(sinceUnix?: number): Promise<TogglTimeEntry[]> {
  const since = sinceUnix ?? Math.floor(Date.now() / 1000) - MAX_LOOKBACK_SECONDS;
  return togglFetch<TogglTimeEntry[]>(`/me/time_entries?since=${since}`);
}

export async function getTogglProjects(): Promise<TogglProject[]> {
  return togglFetch<TogglProject[]>(`/me/projects`);
}
