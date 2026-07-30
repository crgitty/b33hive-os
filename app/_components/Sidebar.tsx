"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconLayoutDashboard,
  IconLayoutKanban,
  IconFolder,
  IconClock,
  IconReportMoney,
  IconBulb,
} from "@tabler/icons-react";
import { formatShortDate, getWeekNumber } from "@/lib/dates";

const LINKS = [
  { href: "/", label: "Overview", Icon: IconLayoutDashboard },
  { href: "/pipeline", label: "Pipeline", Icon: IconLayoutKanban },
  { href: "/projects", label: "Projects", Icon: IconFolder },
  { href: "/time", label: "Time", Icon: IconClock },
  { href: "/finance", label: "Finance", Icon: IconReportMoney },
  { href: "/intelligence", label: "Intelligence", Icon: IconBulb },
];

export function Sidebar() {
  const pathname = usePathname();
  const now = new Date();

  return (
    <aside className="flex w-[150px] shrink-0 flex-col border-r border-border">
      <div className="px-3 py-3">
        <div className="text-xs font-medium tracking-wide">B33HIVE OS</div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-1.5">
        {LINKS.map(({ href, label, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 rounded-r-md border-l-2 py-1.5 pl-2 pr-2 text-xs ${
                active
                  ? "border-gold bg-surface text-gold"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              <Icon size={16} stroke={1.75} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border px-3 py-2.5 text-[10px] leading-tight text-muted">
        <div>{formatShortDate(now)}</div>
        <div>Week {getWeekNumber(now)}</div>
      </div>
    </aside>
  );
}
