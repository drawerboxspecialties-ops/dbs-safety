import type { ReactNode } from "react";

export function PageChrome({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2 print:hidden">
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      {children ? (
        <div className="flex flex-wrap gap-2">{children}</div>
      ) : null}
    </div>
  );
}
