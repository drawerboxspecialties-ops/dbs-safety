import type { ReactNode } from "react";

export function PageChrome({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
      {children ? (
        <div className="flex flex-wrap gap-2">{children}</div>
      ) : null}
    </div>
  );
}
