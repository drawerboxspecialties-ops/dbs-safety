"use client";

import Link from "next/link";
import { PageChrome } from "@/components/page-chrome";
import { PageFrame } from "@/components/page-frame";
import { buttonVariants } from "@/components/ui/button";
import { useMeeting } from "@/lib/meeting-store";
import { packetUrl } from "@/lib/packet";
import { sheetHref } from "@/lib/sheet-href";
import { getTopic } from "@/lib/topics";
import { useShopStore } from "@/lib/use-shop-store";

export default function PacketPage() {
  const { meeting, ready } = useMeeting();
  const shop = useShopStore();
  const topic = getTopic(meeting.topic, shop.store.topics);
  const href = packetUrl(topic.pdf);
  const signHref = sheetHref(
    "/meetings/sign-in",
    meeting.topic,
    meeting.month || shop.monthKey,
  );

  if (!ready) {
    return (
      <PageFrame>
        <p className="text-muted-foreground">Loading packet…</p>
      </PageFrame>
    );
  }

  return (
    <PageFrame fill>
      <PageChrome title={topic.title}>
        <Link href={signHref} className={buttonVariants()}>
          Sign this sheet
        </Link>
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
          <Link
            href={signHref}
            className={buttonVariants({ className: "mt-3" })}
          >
            Sign this sheet
          </Link>
        </div>
      )}
    </PageFrame>
  );
}
