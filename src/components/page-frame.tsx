import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageFrame({
  children,
  className,
  fill,
}: {
  children: ReactNode;
  className?: string;
  fill?: boolean;
}) {
  return (
    <main
      className={cn(
        "mx-auto w-full max-w-7xl px-4 py-3 print:max-w-none print:px-0 print:py-0",
        fill &&
          "flex h-full min-h-0 flex-col overflow-hidden print:h-auto print:overflow-visible",
        className,
      )}
    >
      {children}
    </main>
  );
}
