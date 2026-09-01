"use client";

import Link from "next/link";
import { useMeeting } from "@/lib/meeting-store";
import { getTopic, TOPICS, type TopicId } from "@/lib/topics";
import { DatePicker } from "@/components/date-picker";
import { PageChrome } from "@/components/page-chrome";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useShopStore } from "@/lib/use-shop-store";

export default function MeetingsPage() {
  const { meeting, update, ready } = useMeeting();
  const shop = useShopStore();
  const monthTopic = getTopic(shop.store.schedule[shop.monthKey]);

  function setMonthTopic(month: string, topic: TopicId) {
    const schedule = { ...shop.store.schedule, [month]: topic };
    shop.save({ schedule }).catch(() => shop.setNote("Could not save schedule."));
    if (month === shop.monthKey) update({ topic });
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <PageChrome title="Meeting setup" />

      <section className="glass-panel grid gap-6 rounded-3xl p-6">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            This month
          </p>
          <p className="mt-1 text-lg font-medium">{monthTopic.shortTitle}</p>
          <p className="text-sm text-muted-foreground">
            One topic a month. Cron sets this on the 1st.
          </p>
        </div>

        <div className="grid gap-2">
          <Label>Date</Label>
          {ready ? (
            <DatePicker
              value={meeting.date}
              onChange={(date) => update({ date })}
            />
          ) : (
            <div className="h-11 rounded-lg border bg-muted/40" />
          )}
        </div>

        <div className="grid gap-2">
          <Label>Subject</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {TOPICS.map((topic) => (
              <button
                key={topic.id}
                type="button"
                onClick={() => update({ topic: topic.id })}
                className={cn(
                  "rounded-2xl border px-4 py-3 text-left transition",
                  meeting.topic === topic.id
                    ? "border-cyan-400/80 bg-cyan-50/80 ring-1 ring-cyan-300/70"
                    : "border-transparent bg-white/50 hover:bg-white",
                )}
              >
                <p className="font-medium">{topic.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {topic.minutes}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-2">
          <Label>Year plan</Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {shop.months.map((key) => {
              const selected = shop.store.schedule[key] ?? meeting.topic;
              return (
                <label
                  key={key}
                  className="flex flex-col gap-1 rounded-2xl bg-white/60 px-3 py-2"
                >
                  <span className="text-xs text-muted-foreground">
                    {shop.formatMonthLabel(key)}
                    {key === shop.monthKey ? " · now" : ""}
                  </span>
                  <select
                    value={selected}
                    onChange={(e) =>
                      setMonthTopic(key, e.target.value as TopicId)
                    }
                    className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
                  >
                    {TOPICS.map((topic) => (
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
            <p className="text-sm text-cyan-800">{shop.note}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Crew list and this plan save to the shop store
              {shop.backend === "vercel-blob" ? " on Vercel" : ""}.
            </p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="trainer">Trainer</Label>
          <Input
            id="trainer"
            value={meeting.trainer}
            onChange={(e) => update({ trainer: e.target.value })}
            className="h-11 text-base"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/meetings/talk?topic=${meeting.topic}`}
            className={buttonVariants({ size: "lg" })}
          >
            Start talk
          </Link>
          <Link
            href="/meetings/sign-in"
            className={buttonVariants({ size: "lg", variant: "outline" })}
          >
            Sign-in
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={() =>
              shop
                .save({ crew: undefined, schedule: shop.store.schedule })
                .catch(() => shop.setNote("Could not save."))
            }
          >
            Save plan
          </Button>
        </div>
      </section>
    </main>
  );
}
