"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { OPS_HUB_URL } from "@/lib/base-path";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Topics", match: (path: string) => path === "/" },
  {
    href: "/meetings/packet",
    label: "Packet",
    match: (path: string) => path.startsWith("/meetings/packet"),
  },
  {
    href: "/meetings/sign-in",
    label: "Sign",
    match: (path: string) => path.startsWith("/meetings/sign-in"),
  },
  {
    href: "/meetings/record",
    label: "Who's left",
    match: (path: string) => path.startsWith("/meetings/record"),
  },
];

export function AppNav() {
  const path = usePathname();

  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm">
      <a
        href={OPS_HUB_URL}
        className="rounded-full px-3 py-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
      >
        Ops Hub
      </a>
      {links.map((link) => {
        const active = link.match(path);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-full px-3 py-1.5 transition",
              active
                ? "bg-white font-medium text-[#0b1220] hover:bg-cyan-50"
                : "text-white/70 hover:bg-white/10 hover:text-white",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
