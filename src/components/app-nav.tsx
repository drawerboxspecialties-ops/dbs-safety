"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { OPS_HUB_URL } from "@/lib/base-path";
import { cn } from "@/lib/utils";

export function AppNav() {
  const path = usePathname();
  const home = path === "/";

  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm">
      <a
        href={OPS_HUB_URL}
        className="rounded-full px-3 py-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
      >
        Ops Hub
      </a>
      <Link
        href="/"
        className={cn(
          "rounded-full px-3 py-1.5 transition",
          home
            ? "bg-white font-medium text-[#0b1220] hover:bg-cyan-50"
            : "text-white/70 hover:bg-white/10 hover:text-white",
        )}
      >
        Safety Topic
      </Link>
    </nav>
  );
}
