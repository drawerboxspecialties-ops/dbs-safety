import { Suspense } from "react";
import Link from "next/link";
import { AppNav } from "@/components/app-nav";

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
          <Suspense fallback={<nav className="h-8" />}>
            <AppNav />
          </Suspense>
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
