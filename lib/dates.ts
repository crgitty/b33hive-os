// Stored UTC, displayed local — "local" is the operator's own machine, which is fine for
// a single-operator, local-first app.

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

export function daysAgoIso(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

export function startOfWeekIso(): string {
  const d = new Date();
  const day = d.getDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? 6 : day - 1;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - diffToMonday);
  return d.toISOString();
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7); // "YYYY-MM"
}

/** For values that represent a calendar day, not a moment in time (e.g. a due date
 * entered via <input type="date">). Those land in the DB as UTC midnight; formatDate's
 * local-time conversion can then shift them a day in any timezone behind UTC. This reads
 * the date parts directly off the string instead of round-tripping through a Date. */
export function formatDateOnly(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Local wall-clock value for a <input type="datetime-local"> defaultValue. */
export function nowLocalInputValue(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
