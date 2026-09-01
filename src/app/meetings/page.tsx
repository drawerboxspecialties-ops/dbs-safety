"use client";

import Link from "next/link";
import { useMeeting } from "@/lib/meeting-store";
import { TOPICS } from "@/lib/topics";
import { DatePicker } from "@/components/date-picker";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function MeetingsPage() {
  const { meeting, update, ready } = useMeeting();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <p className="text-sm font-semibold text-[#003366]">DBS Safety</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">
        Safety Meeting App
      </h1>
      <p className="mt-2 text-muted-foreground">
        Start a crew meeting. The date, topic, and trainer carry into the talk
        and the OSHA sign-in sheet.
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Meeting setup</CardTitle>
          <CardDescription>
            Required for the written certification: date and subject.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-2">
            <Label>Date of training</Label>
            {ready ? (
              <DatePicker
                value={meeting.date}
                onChange={(date) => update({ date })}
              />
            ) : (
              <div className="h-11 rounded-md border bg-muted/40" />
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
                    "rounded-lg border p-4 text-left transition",
                    meeting.topic === topic.id
                      ? "border-[#003366] bg-[#003366]/5 ring-2 ring-[#003366]"
                      : "hover:border-[#003366]/40",
                  )}
                >
                  <p className="font-semibold">{topic.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {topic.minutes} · {topic.osha.split("·")[0]}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="trainer">Trainer / certifying person</Label>
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
              className={cn(
                buttonVariants({ size: "lg" }),
                "bg-[#003366] hover:bg-[#00264d]",
              )}
            >
              Start the talk
            </Link>
            <Link
              href="/meetings/sign-in"
              className={buttonVariants({ size: "lg", variant: "outline" })}
            >
              Skip to sign-in
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
