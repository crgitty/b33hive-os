"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/projects", label: "Projects" },
  { href: "/time", label: "Time" },
  { href: "/finance", label: "Finance" },
  { href: "/intelligence", label: "Intelligence" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-border px-6 py-3">
      <div className="mx-auto flex w-full max-w-6xl gap-5">
        {LINKS.map((link) => {
          const active =
            link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm ${active ? "text-gold" : "text-muted hover:text-foreground"}`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
