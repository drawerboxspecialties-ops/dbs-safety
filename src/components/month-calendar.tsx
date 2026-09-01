"use client";

import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
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
  if (kind === "now") return "Now";
  if (kind === "upcoming") return "Later";
  return "Open";
}

export function MonthCalendar({
  year,
  now,
  selected,
  schedule,
  topics,
  ready,
  disabled,
  title,
  lead,
  preview,
  printFocus,
  onYearChange,
  onSelect,
  onDelete,
}: {
  year: number;
  now: MonthKey;
  selected: MonthKey;
  schedule: Record<MonthKey, TopicId>;
  topics: Topic[];
  ready: boolean;
  disabled?: boolean;
  title?: string;
  lead?: ReactNode;
  preview?: ReactNode;
  printFocus?: boolean;
  onYearChange: (year: number) => void;
  onSelect: (month: MonthKey, topicId: TopicId) => void;
  onDelete?: (month: MonthKey) => void;
}) {
  return (
    <section className="glass-panel flex h-full min-h-0 flex-col rounded-2xl p-3 print:h-auto print:overflow-visible print:bg-white print:p-0 print:shadow-none">
      {title || lead ? (
        <div
          className={cn(
            "mb-3 flex shrink-0 flex-wrap items-center gap-2",
            printFocus && "print:hidden",
          )}
        >
          {title ? (
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          ) : null}
          {lead ? <div className="min-w-[12rem] flex-1">{lead}</div> : null}
        </div>
      ) : null}
      <div
        className={cn(
          "min-h-0 flex-1",
          preview &&
            "grid items-stretch gap-3 grid-cols-[minmax(13rem,17rem)_minmax(0,1fr)] print:block",
        )}
      >
        <div
          className={cn(
            "flex min-h-0 flex-col",
            printFocus && "print:hidden",
          )}
        >
          <div className="mb-2 flex shrink-0 items-center gap-1">
            <p className="mr-1 text-sm font-semibold tabular-nums">{year}</p>
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
        <div
          className={cn(
            "grid min-h-0 content-start gap-2",
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
              <div key={key} className="relative">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelect(key, topicId)}
                  className={cn(
                    "w-full rounded-xl border text-left transition",
                    preview ? "min-h-[3.75rem] px-2 py-1.5" : "min-h-[6rem] px-3 py-2.5",
                    topic && onDelete ? "pr-8" : "",
                    active
                      ? "border-cyan-400/80 bg-cyan-50/80 ring-1 ring-cyan-300/70"
                      : topic && kind === "done"
                        ? "border-transparent bg-emerald-50/80 hover:bg-emerald-50"
                        : kind === "now"
                          ? "border-transparent bg-white/80 ring-1 ring-cyan-200/70 hover:bg-white"
                          : "glass-panel border-transparent hover:bg-white/90",
                  )}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <p className="text-sm font-semibold">
                      {formatMonthShort(key)}
                    </p>
                    {preview ? null : (
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                          topic && onDelete ? "mr-5" : "",
                          topic && kind === "done"
                            ? "bg-emerald-100 text-emerald-900"
                            : kind === "now"
                              ? "bg-cyan-100 text-cyan-950"
                              : "bg-white/70 text-muted-foreground",
                        )}
                      >
                        {topic ? monthKindLabel(kind) : "Open"}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-sm font-medium leading-snug text-foreground">
                    {topic ? topic.shortTitle : "Choose a talk"}
                  </p>
                  {preview ? null : (
                    <p className="mt-1 text-xs text-muted-foreground">
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
                {topic && onDelete ? (
                  <button
                    type="button"
                    disabled={disabled}
                    aria-label={`Delete topic from ${formatMonthShort(key)}`}
                    onClick={() => onDelete(key)}
                    className="absolute top-1 right-1 rounded-md p-1 text-red-800 hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
        </div>
        {preview ? (
          <div className="min-h-0 min-w-0 overflow-hidden print:overflow-visible print:w-full">
            {preview}
          </div>
        ) : null}
      </div>
    </section>
  );
}
