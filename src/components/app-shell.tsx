import Link from "next/link";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="print:hidden border-b bg-[#003366] text-white">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-amber-300">
              DRAWER BOX SPECIALTIES
            </p>
            <p className="text-lg font-semibold leading-tight">DBS Safety</p>
          </Link>
          <nav className="flex flex-wrap items-center gap-1 text-sm">
            <Link
              href="/"
              className="rounded-md px-3 py-1.5 hover:bg-white/10"
            >
              Home
            </Link>
            <Link
              href="/meetings"
              className="rounded-md bg-amber-400 px-3 py-1.5 font-semibold text-[#003366] hover:bg-amber-300"
            >
              Safety Meeting
            </Link>
          </nav>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="print:hidden border-t bg-white/70">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap justify-between gap-2 px-4 py-3 text-xs text-muted-foreground">
          <span>Drawer Box Specialties · Drawer boxes, cabinets, and doors</span>
          <span>Toolbox talks support OSHA 1910.132 and 1910.176 / 1910.178</span>
        </div>
      </footer>
    </div>
  );
}
