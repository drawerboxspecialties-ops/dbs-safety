"use client";

import { useState } from "react";
import { PageChrome } from "@/components/page-chrome";
import { PageFrame } from "@/components/page-frame";
import { SignInSheet } from "@/components/sign-in-sheet";
import { Button } from "@/components/ui/button";
import { useMeeting } from "@/lib/meeting-store";
import { packetUrl } from "@/lib/packet";
import { getTopic } from "@/lib/topics";
import { useShopStore } from "@/lib/use-shop-store";

export default function PacketPage() {
  const { meeting, ready } = useMeeting();
  const shop = useShopStore();
  const topic = getTopic(meeting.topic, shop.store.topics);
  const href = packetUrl(topic.pdf);
  const [showSheet, setShowSheet] = useState(false);

  if (!ready) {
    return (
      <PageFrame>
        <p className="text-muted-foreground">Loading packet…</p>
      </PageFrame>
    );
  }

  if (showSheet) {
    return (
      <PageFrame fill>
        <SignInSheet
          embedded
          topicId={meeting.topic}
          month={meeting.month || shop.monthKey}
          onBack={() => setShowSheet(false)}
        />
      </PageFrame>
    );
  }

  return (
    <PageFrame fill>
      <PageChrome title={topic.title}>
        <Button type="button" onClick={() => setShowSheet(true)}>
          Sign this sheet
        </Button>
      </PageChrome>

      {href ? (
        <iframe
          title={`${topic.title} PDF`}
          src={href}
          className="min-h-0 w-full flex-1 rounded-2xl border bg-white"
        />
      ) : (
        <div className="glass-panel rounded-2xl p-4">
          <p>No PDF on this topic.</p>
          <Button
            type="button"
            className="mt-3"
            onClick={() => setShowSheet(true)}
          >
            Sign this sheet
          </Button>
        </div>
      )}
    </PageFrame>
  );
}
