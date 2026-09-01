"use client";

import Link from "next/link";
import { useMeeting } from "@/lib/meeting-store";
import { TOPICS } from "@/lib/topics";
import { DatePicker } from "@/components/date-picker";
import { PageChrome } from "@/components/page-chrome";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function MeetingsPage() {
  const { meeting, update, ready } = useMeeting();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <PageChrome title="Meeting setup" />

      <section className="glass-panel grid gap-6 rounded-3xl p-6">
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
          <Link
            href="/meetings/record"
            className={buttonVariants({ size: "lg", variant: "ghost" })}
          >
            Record
          </Link>
        </div>
      </section>
    </main>
  );
}
