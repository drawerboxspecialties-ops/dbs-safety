"use client";

import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatMonthShort,
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
  lead,
  preview,
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
  lead?: ReactNode;
  preview?: ReactNode;
  onYearChange: (year: number) => void;
  onSelect: (month: MonthKey, topicId: TopicId) => void;
}) {
  return (
    <section className="glass-panel flex h-full min-h-0 flex-col rounded-3xl p-4">
      {lead ? <div className="mb-3 shrink-0">{lead}</div> : null}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Year
          </p>
          <h2 className="text-lg font-semibold leading-tight">{year}</h2>
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
      <div
        className={cn(
          "mt-3 min-h-0 flex-1",
          preview
            ? "grid items-stretch gap-3 grid-cols-[minmax(13.5rem,18rem)_minmax(0,1fr)]"
            : "",
        )}
      >
        <div
          className={cn(
            "grid content-start gap-2",
            preview
              ? "grid-cols-2 overflow-y-auto pr-0.5"
              : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
          )}
        >
          {yearMonths(year).map((key) => {
            const topicId = schedule[key] || "";
            const topic = topicId ? getTopic(topicId, topics) : null;
            const saved =
              ready && topicId ? progressForMonth(key, topicId) : null;
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
                  "rounded-2xl border text-left transition",
                  preview ? "min-h-[4.75rem] px-2.5 py-2" : "min-h-[6.75rem] px-3 py-3",
                  active
                    ? "border-cyan-400/80 bg-cyan-50/80 ring-1 ring-cyan-300/70"
                    : topic && kind === "done"
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
                      topic && kind === "done"
                        ? "bg-emerald-100 text-emerald-900"
                        : kind === "now"
                          ? "bg-cyan-100 text-cyan-950"
                          : "bg-white/70 text-muted-foreground",
                    )}
                  >
                    {topic ? monthKindLabel(kind) : "Open"}
                  </span>
                </div>
                <p className="mt-1.5 truncate text-sm font-medium leading-snug">
                  {topic ? topic.shortTitle : "Choose a talk"}
                </p>
                {preview ? null : (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {topic
                      ? signed > 0
                        ? `${signed} signed`
                        : kind === "upcoming"
                          ? "Not yet"
                          : "No signatures"
                      : "No topic yet"}
                  </p>
                )}
              </button>
            );
          })}
        </div>
        {preview ? (
          <div className="min-h-0 min-w-0 overflow-hidden">{preview}</div>
        ) : null}
      </div>
    </section>
  );
}
