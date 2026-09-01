import { Suspense } from "react";
import { PageFrame } from "@/components/page-frame";
import { TalkView } from "./talk-view";

export default function TalkPage() {
  return (
    <Suspense
      fallback={
        <PageFrame>
          <p className="text-muted-foreground">Loading talk…</p>
        </PageFrame>
      }
    >
      <TalkView />
    </Suspense>
  );
}
