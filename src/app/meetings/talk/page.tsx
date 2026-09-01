import { Suspense } from "react";
import { TalkView } from "./talk-view";

export default function TalkPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-7xl px-4 py-4">
          <p className="text-sm text-muted-foreground">Loading talk…</p>
        </main>
      }
    >
      <TalkView />
    </Suspense>
  );
}
