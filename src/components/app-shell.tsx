import Link from "next/link";
import { OPS_HUB_URL } from "@/lib/base-path";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="print:hidden sticky top-0 z-40 border-b border-white/10 bg-[#0b1220]/88 text-white backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="min-w-0 tracking-tight">
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/50">
              Drawer Box Specialties
            </p>
            <p className="text-base font-semibold">DBS Safety</p>
          </Link>
          <nav className="flex flex-wrap items-center gap-1 text-sm">
            <a
              href={OPS_HUB_URL}
              className="rounded-full px-3 py-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              Ops Hub
            </a>
            <Link
              href="/"
              className="rounded-full px-3 py-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              Home
            </Link>
            <Link
              href="/meetings"
              className="rounded-full bg-white px-3 py-1.5 font-medium text-[#0b1220] hover:bg-cyan-50"
            >
              Meeting
            </Link>
          </nav>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="print:hidden border-t border-foreground/5">
        <div className="mx-auto w-full max-w-6xl px-4 py-4 text-xs text-muted-foreground">
          Drawer Box Specialties
        </div>
      </footer>
    </div>
  );
}
