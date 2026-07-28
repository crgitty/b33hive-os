// Money is always integer cents in the database. Format at the edge, round on display.

export function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.round(cents) / 100);
}

export function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}
