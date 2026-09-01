"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatMonthName,
  formatMonthShort,
  topicForMonth,
  yearMonths,
  type MonthKey,
} from "@/lib/shop-data";
import { progressForMonth } from "@/lib/meeting-store";
import { getTopic, type Topic, type TopicId } from "@/lib/topics";
import { cn } from "@/lib/utils";

export type MonthKind = "done" | "now" | "upcoming" | "empty";

export function monthKind(
  key: MonthKey,
  now: MonthKey,
  signed: number,
): MonthKind {
  if (key === now) return "now";
  if (key > now) return "upcoming";
  return signed > 0 ? "done" : "empty";
}

export function monthKindLabel(kind: MonthKind) {
  if (kind === "done") return "Done";
  if (kind === "now") return "This month";
  if (kind === "upcoming") return "Coming up";
  return "No sheet";
}

export function MonthCalendar({
  year,
  now,
  selected,
  schedule,
  topics,
  ready,
  disabled,
  onYearChange,
  onSelect,
}: {
  year: number;
  now: MonthKey;
  selected: MonthKey;
  schedule: Record<MonthKey, TopicId>;
  topics: Topic[];
  ready: boolean;
  disabled?: boolean;
  onYearChange: (year: number) => void;
  onSelect: (month: MonthKey, topicId: TopicId) => void;
}) {
  return (
    <section className="glass-panel rounded-3xl p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Year
          </p>
          <h2 className="text-lg font-semibold">{year}</h2>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Previous year"
            disabled={disabled}
            onClick={() => onYearChange(year - 1)}
          >
            <ChevronLeft />
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={disabled}
            onClick={() => onYearChange(Number(now.slice(0, 4)))}
          >
            This year
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Next year"
            disabled={disabled}
            onClick={() => onYearChange(year + 1)}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Months only — no dates. Tap a month to open that packet.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {yearMonths(year).map((key) => {
          const topicId = schedule[key] || topicForMonth(key);
          const topic = getTopic(topicId, topics);
          const saved = ready ? progressForMonth(key, topicId) : null;
          const signed = saved?.signed ?? 0;
          const kind = monthKind(key, now, signed);
          const active = selected === key;
          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(key, topicId)}
              className={cn(
                "min-h-[7.5rem] rounded-2xl border px-3 py-3 text-left transition",
                active
                  ? "border-cyan-400/80 bg-cyan-50/80 ring-1 ring-cyan-300/70"
                  : kind === "done"
                    ? "border-transparent bg-emerald-50/80 hover:bg-emerald-50"
                    : kind === "now"
                      ? "border-transparent bg-white/80 ring-1 ring-cyan-200/70 hover:bg-white"
                      : "glass-panel border-transparent hover:-translate-y-0.5",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">{formatMonthShort(key)}</p>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                    kind === "done"
                      ? "bg-emerald-100 text-emerald-900"
                      : kind === "now"
                        ? "bg-cyan-100 text-cyan-950"
                        : kind === "upcoming"
                          ? "bg-white/80 text-muted-foreground"
                          : "bg-white/50 text-muted-foreground",
                  )}
                >
                  {monthKindLabel(kind)}
                </span>
              </div>
              <p className="mt-2 text-sm font-medium leading-snug">
                {topic.shortTitle}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {signed > 0
                  ? `${signed} signed`
                  : kind === "upcoming"
                    ? "Not yet"
                    : "No signatures"}
              </p>
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        {formatMonthName(selected)} is the last month you opened.
      </p>
    </section>
  );
}
