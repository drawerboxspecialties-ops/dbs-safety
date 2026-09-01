"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MonthCalendar } from "@/components/month-calendar";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMeeting } from "@/lib/meeting-store";
import { ingestPdf, packetUrl } from "@/lib/packet";
import { sheetHref } from "@/lib/sheet-href";
import {
  formatMonthName,
  formatMonthShort,
  yearMonths,
} from "@/lib/shop-data";
import { getTopic } from "@/lib/topics";
import { useShopStore } from "@/lib/use-shop-store";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const { meeting, update, ready } = useMeeting();
  const shop = useShopStore();
  const catalog = shop.store.topics;
  const [month, setMonth] = useState(shop.monthKey);
  const [year, setYear] = useState(() =>
    Number((meeting.month || shop.monthKey).slice(0, 4)),
  );
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState("");
  const previewRef = useRef<HTMLDivElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [assignYear, setAssignYear] = useState(() =>
    new Date().getFullYear(),
  );
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!ready) return;
    const nextMonth = meeting.month || shop.monthKey;
    setMonth(nextMonth);
    setYear(Number(nextMonth.slice(0, 4)));
  }, [ready, meeting.month, shop.monthKey]);

  function showMonth(topicId: string, monthKey: string) {
    if (topicId) update({ topic: topicId, month: monthKey });
    else update({ month: monthKey });
    setMonth(monthKey);
    setYear(Number(monthKey.slice(0, 4)));
    setExpanded(monthKey);
    requestAnimationFrame(() => {
      previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function expandMonth(topicId: string, monthKey: string) {
    if (expanded === monthKey) {
      setExpanded("");
      return;
    }
    showMonth(topicId, monthKey);
  }

  async function assignTopicToMonth(topicId: string, monthKey: string) {
    await shop.save({
      schedule: { ...shop.store.schedule, [monthKey]: topicId },
    });
    showMonth(topicId, monthKey);
  }

  function queueFile(file: File | undefined) {
    if (!file) return;
    setError("");
    if (expanded && !shop.store.schedule[expanded]) {
      void assignFileToMonth(expanded, file);
      return;
    }
    setPendingFile(file);
    setAssignYear(year);
  }

  async function assignFileToMonth(monthKey: string, file = pendingFile) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const created = await ingestPdf(file, catalog);
      await shop.save({
        topics: [...catalog, created],
        schedule: { ...shop.store.schedule, [monthKey]: created.id },
      });
      setPendingFile(null);
      showMonth(created.id, monthKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add PDF.");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-10">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:py-10">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Safety Topic
      </h1>

      <input
        ref={fileRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          queueFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <div className="mt-6">
        <MonthCalendar
          year={year}
          now={shop.monthKey}
          selected={expanded}
          schedule={shop.store.schedule}
          topics={catalog}
          ready={ready}
          disabled={busy}
          onYearChange={(nextYear) => {
            setYear(nextYear);
            if (expanded && !expanded.startsWith(`${nextYear}-`)) {
              setExpanded("");
            }
          }}
          onSelect={(key, topicId) => expandMonth(topicId, key)}
          preview={
            expanded ? (
              <div
                ref={previewRef}
                className="h-full rounded-2xl border bg-white p-3 sm:p-4"
              >
                {shop.store.schedule[expanded] ? (
                  <>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {shop.formatMonthLabel(expanded)}
                        </p>
                        <h3 className="text-lg font-semibold">
                          {
                            getTopic(shop.store.schedule[expanded], catalog)
                              .title
                          }
                        </h3>
                      </div>
                      <Link
                        href={sheetHref(
                          "/meetings/sign-in",
                          shop.store.schedule[expanded],
                          expanded,
                        )}
                        className={buttonVariants()}
                      >
                        Sign this sheet
                      </Link>
                    </div>
                    {packetUrl(
                      getTopic(shop.store.schedule[expanded], catalog).pdf,
                    ) ? (
                      <iframe
                        title={`${getTopic(shop.store.schedule[expanded], catalog).title} PDF`}
                        src={packetUrl(
                          getTopic(shop.store.schedule[expanded], catalog).pdf,
                        )}
                        className="min-h-[70vh] w-full rounded-xl border bg-white"
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No PDF on this talk.
                      </p>
                    )}
                  </>
                ) : (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {shop.formatMonthLabel(expanded)}
                    </p>
                    <h3 className="text-lg font-semibold">Choose a talk</h3>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {catalog.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void assignTopicToMonth(item.id, expanded)
                          }
                          className="rounded-xl border bg-muted/50 px-3 py-3 text-left hover:bg-muted"
                        >
                          <p className="font-medium">{item.title}</p>
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="mt-3 text-sm text-cyan-800 underline"
                      onClick={() => fileRef.current?.click()}
                    >
                      Or drop a new PDF
                    </button>
                  </div>
                )}
              </div>
            ) : null
          }
          lead={
            <div>
              <button
                type="button"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  queueFile(e.dataTransfer.files?.[0]);
                }}
                className={cn(
                  "flex min-h-24 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-5 text-center transition",
                  dragOver
                    ? "border-cyan-400 bg-cyan-50/80"
                    : "border-cyan-200/70 bg-white/50 hover:border-cyan-300",
                )}
              >
                <p className="font-medium">
                  {busy ? "Saving PDF…" : "Drop a PDF here"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Or tap to choose a file. Then pick the month it is for.
                </p>
              </button>
              {error ? (
                <p className="mt-2 text-sm text-red-700">{error}</p>
              ) : null}
            </div>
          }
        />
      </div>

      <Dialog
        open={pendingFile !== null}
        onOpenChange={(open) => {
          if (!open && !busy) setPendingFile(null);
        }}
      >
        <DialogContent className="sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle>Which month is this for?</DialogTitle>
            <DialogDescription>
              {pendingFile
                ? `${pendingFile.name} — tap the month this talk belongs to.`
                : "Tap the month this talk belongs to."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => setAssignYear((n) => n - 1)}
            >
              {assignYear - 1}
            </Button>
            <p className="font-medium">{assignYear}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => setAssignYear((n) => n + 1)}
            >
              {assignYear + 1}
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {yearMonths(assignYear).map((key) => (
              <button
                key={key}
                type="button"
                disabled={busy}
                onClick={() => void assignFileToMonth(key)}
                className={cn(
                  "rounded-xl border px-3 py-3 text-left text-sm transition",
                  key === shop.monthKey
                    ? "border-cyan-400/80 bg-cyan-50/80"
                    : "border-transparent bg-muted/60 hover:bg-muted",
                )}
              >
                <p className="font-medium">{formatMonthShort(key)}</p>
                <p className="text-xs text-muted-foreground">
                  {key === shop.monthKey ? "Now" : formatMonthName(key)}
                </p>
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setPendingFile(null)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
