"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { OPS_HUB_URL } from "@/lib/base-path";
import { cn } from "@/lib/utils";

export function AppNav() {
  const path = usePathname();
  const search = useSearchParams();
  const showingLeft = search.get("left") === "1";
  const links = [
    { href: "/", label: "Safety Topic", active: path === "/" },
    {
      href: "/meetings/packet",
      label: "Packet",
      active: path.startsWith("/meetings/packet"),
    },
    {
      href: "/meetings/sign-in",
      label: "Sign",
      active: path.startsWith("/meetings/sign-in") && !showingLeft,
    },
    {
      href: "/meetings/sign-in?left=1",
      label: "Who's left",
      active:
        showingLeft ||
        path.startsWith("/meetings/record"),
    },
  ];

  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm">
      <a
        href={OPS_HUB_URL}
        className="rounded-full px-3 py-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
      >
        Ops Hub
      </a>
      {links.map((link) => {
        const active = link.active;
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
