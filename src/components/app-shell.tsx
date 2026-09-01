import Link from "next/link";
import { AppNav } from "@/components/app-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden print:h-auto print:overflow-visible">
      <header className="print:hidden z-40 h-14 shrink-0 border-b border-white/10 bg-[#0b1220]/88 text-white backdrop-blur-md">
        <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between gap-3 px-4">
          <Link href="/" className="min-w-0 tracking-tight">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/50">
              Drawer Box Specialties
            </p>
            <p className="text-sm font-semibold leading-tight">DBS Safety</p>
          </Link>
          <AppNav />
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-auto print:overflow-visible">
        {children}
      </div>
    </div>
  );
}
