"use client";

import { useState } from "react";
import Link from "next/link";
import { useMeeting } from "@/lib/meeting-store";
import { getTopic, type Topic, type TopicId } from "@/lib/topics";
import { AddTopicDialog } from "@/components/add-topic-dialog";
import { PageChrome } from "@/components/page-chrome";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useShopStore } from "@/lib/use-shop-store";

export default function MeetingsPage() {
  const { meeting, update } = useMeeting();
  const shop = useShopStore();
  const catalog = shop.store.topics;
  const monthTopic = getTopic(shop.store.schedule[shop.monthKey], catalog);
  const [adding, setAdding] = useState(false);

  function setMonthTopic(month: string, topic: TopicId) {
    const schedule = { ...shop.store.schedule, [month]: topic };
    shop.save({ schedule }).catch(() => shop.setNote("Could not save schedule."));
    if (month === shop.monthKey) update({ topic });
  }

  async function saveTopic(topic: Topic) {
    const topics = [...catalog, topic];
    await shop.save({ topics });
    update({ topic: topic.id });
    shop.setNote("Topic saved.");
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <PageChrome title="Topic">
        <Button type="button" variant="outline" onClick={() => setAdding(true)}>
          Add PDF
        </Button>
      </PageChrome>

      <section className="glass-panel grid gap-6 rounded-3xl p-6">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            This month
          </p>
          <p className="mt-1 text-lg font-medium">{monthTopic.shortTitle}</p>
        </div>

        <div className="grid gap-2">
          <Label>Use this topic</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {catalog.map((topic) => (
              <button
                key={topic.id}
                type="button"
                onClick={() => {
                  update({ topic: topic.id });
                  setMonthTopic(shop.monthKey, topic.id);
                }}
                className={cn(
                  "rounded-2xl border px-4 py-3 text-left transition",
                  meeting.topic === topic.id
                    ? "border-cyan-400/80 bg-cyan-50/80 ring-1 ring-cyan-300/70"
                    : "border-transparent bg-white/50 hover:bg-white",
                )}
              >
                <p className="font-medium">{topic.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {topic.source === "hr"
                    ? "HR packet"
                    : topic.source === "ai"
                      ? "AI draft"
                      : "Built in"}
                  {topic.pdf ? " · PDF" : ""}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="trainer">Your name (trainer)</Label>
          <Input
            id="trainer"
            value={meeting.trainer}
            onChange={(e) => update({ trainer: e.target.value })}
            placeholder="Who is giving the talk"
            className="h-11 text-base"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/meetings/talk?topic=${meeting.topic}`}
            className={buttonVariants({ size: "lg" })}
          >
            Talk notes
          </Link>
          <Link
            href="/meetings/sign-in"
            className={buttonVariants({ size: "lg", variant: "outline" })}
          >
            Sign a department
          </Link>
        </div>

        <details className="rounded-2xl bg-white/60 px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium">
            Rest of the year
          </summary>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {shop.months.map((key) => {
              const selected = shop.store.schedule[key] ?? meeting.topic;
              return (
                <label
                  key={key}
                  className="flex flex-col gap-1 rounded-xl bg-white/80 px-3 py-2"
                >
                  <span className="text-xs text-muted-foreground">
                    {shop.formatMonthLabel(key)}
                    {key === shop.monthKey ? " · now" : ""}
                  </span>
                  <select
                    value={selected}
                    onChange={(e) => setMonthTopic(key, e.target.value)}
                    className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
                  >
                    {catalog.map((topic) => (
                      <option key={topic.id} value={topic.id}>
                        {topic.shortTitle}
                      </option>
                    ))}
                  </select>
                </label>
              );
            })}
          </div>
          {shop.note ? (
            <p className="mt-2 text-sm text-cyan-800">{shop.note}</p>
          ) : null}
        </details>
      </section>

      <AddTopicDialog
        open={adding}
        onOpenChange={setAdding}
        existing={catalog}
        onSave={saveTopic}
      />
    </main>
  );
}
