"use client";

import Link from "next/link";
import { PageChrome } from "@/components/page-chrome";
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
      <main className="mx-auto w-full max-w-7xl px-4 py-4">
        <p className="text-sm text-muted-foreground">Loading packet…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-4">
      <PageChrome title={topic.title}>
        <Link href={signHref} className={buttonVariants()}>
          Sign this sheet
        </Link>
      </PageChrome>

      {href ? (
        <iframe
          title={`${topic.title} PDF`}
          src={href}
          className="min-h-[70vh] w-full rounded-3xl border bg-white"
        />
      ) : (
        <div className="glass-panel rounded-3xl p-6">
          <p className="text-sm">No PDF on this topic.</p>
          <Link
            href={signHref}
            className={buttonVariants({ className: "mt-4" })}
          >
            Sign this sheet
          </Link>
        </div>
      )}
    </main>
  );
}
