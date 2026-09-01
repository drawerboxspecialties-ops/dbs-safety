"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { MonthCalendar } from "@/components/month-calendar";
import { PageFrame } from "@/components/page-frame";
import { SignInSheet } from "@/components/sign-in-sheet";
import { Button } from "@/components/ui/button";
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
import {
  formatMonthName,
  formatMonthShort,
  lockTopicToMonth,
  monthTopic,
  unlockMonth,
  yearMonths,
} from "@/lib/shop-data";
import { getTopic } from "@/lib/topics";
import { useShopStore } from "@/lib/use-shop-store";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const { meeting, update, ready } = useMeeting();
  const shop = useShopStore();
  const catalog = shop.store.topics;
  const [year, setYear] = useState(() =>
    Number((meeting.month || shop.monthKey).slice(0, 4)),
  );
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [assignYear, setAssignYear] = useState(() =>
    new Date().getFullYear(),
  );
  const [clearMonth, setClearMonth] = useState("");
  const [showSheet, setShowSheet] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!ready) return;
    const nextMonth = meeting.month || shop.monthKey;
    setYear(Number(nextMonth.slice(0, 4)));
  }, [ready, meeting.month, shop.monthKey]);

  function showMonth(topicId: string, monthKey: string) {
    if (topicId) update({ topic: topicId, month: monthKey });
    else update({ month: monthKey });
    setYear(Number(monthKey.slice(0, 4)));
    setExpanded(monthKey);
  }

  function expandMonth(topicId: string, monthKey: string) {
    if (expanded === monthKey && !showSheet) {
      setExpanded("");
      return;
    }
    setShowSheet(false);
    showMonth(topicId, monthKey);
  }

  async function assignTopicToMonth(topicId: string, monthKey: string) {
    const schedule = lockTopicToMonth(shop.store.schedule, monthKey, topicId);
    if (!schedule) {
      setError("This month already has a talk. Delete it first to choose another.");
      return;
    }
    setError("");
    await shop.save({ schedule });
    showMonth(topicId, monthKey);
  }

  async function removeTopicFromMonth(monthKey: string) {
    await shop.save({ schedule: unlockMonth(shop.store.schedule, monthKey) });
    setClearMonth("");
    setError("");
    showMonth("", monthKey);
  }

  function queueFile(file: File | undefined) {
    if (!file) return;
    setError("");
    if (expanded && !monthTopic(shop.store.schedule, expanded)) {
      void assignFileToMonth(expanded, file);
      return;
    }
    setPendingFile(file);
    setAssignYear(year);
  }

  async function assignFileToMonth(monthKey: string, file = pendingFile) {
    if (!file) return;
    if (monthTopic(shop.store.schedule, monthKey)) {
      setError("This month already has a talk. Delete it first to choose another.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const created = await ingestPdf(file, catalog);
      const schedule = lockTopicToMonth(
        shop.store.schedule,
        monthKey,
        created.id,
      );
      if (!schedule) {
        setError("This month already has a talk. Delete it first to choose another.");
        return;
      }
      await shop.save({
        topics: [...catalog, created],
        schedule,
      });
      setPendingFile(null);
      showMonth(created.id, monthKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add PDF.");
    } finally {
      setBusy(false);
    }
  }

  const expandedTopicId = expanded
    ? monthTopic(shop.store.schedule, expanded)
    : "";
  const expandedTopic = expandedTopicId
    ? getTopic(expandedTopicId, catalog)
    : null;

  if (!ready) {
    return (
      <PageFrame>
        <p className="text-muted-foreground">Loading…</p>
      </PageFrame>
    );
  }

  return (
    <PageFrame fill>
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

      <div className="min-h-0 flex-1">
        <MonthCalendar
          title="Safety Topic"
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
              setShowSheet(false);
            }
          }}
          printFocus={showSheet}
          onSelect={(key, topicId) => expandMonth(topicId, key)}
          onDelete={(key) => {
            setExpanded(key);
            setClearMonth(key);
          }}
          preview={
            expanded ? (
              <div className="flex h-full min-h-0 flex-col rounded-xl border bg-white p-3">
                {expandedTopic && showSheet ? (
                  <SignInSheet
                    embedded
                    onBack={() => setShowSheet(false)}
                  />
                ) : expandedTopic ? (
                  <>
                    <div className="mb-2 flex shrink-0 flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                          {shop.formatMonthLabel(expanded)}
                        </p>
                        <h3 className="truncate text-base font-semibold leading-tight">
                          {expandedTopic.title}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Locked until you delete it
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="destructive"
                          disabled={busy}
                          onClick={() => setClearMonth(expanded)}
                        >
                          <Trash2 />
                          Delete topic
                        </Button>
                        <Button
                          type="button"
                          onClick={() => {
                            showMonth(expandedTopicId, expanded);
                            setShowSheet(true);
                          }}
                        >
                          Sign this sheet
                        </Button>
                      </div>
                    </div>
                    {packetUrl(expandedTopic.pdf) ? (
                      <iframe
                        title={`${expandedTopic.title} PDF`}
                        src={packetUrl(expandedTopic.pdf)}
                        className="min-h-0 w-full flex-1 rounded-xl border bg-white"
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No PDF on this talk.
                      </p>
                    )}
                  </>
                ) : (
                  <div className="min-h-0 overflow-y-auto">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      {shop.formatMonthLabel(expanded)}
                    </p>
                    <h3 className="text-base font-semibold leading-tight">
                      Choose a talk
                    </h3>
                    {catalog.length === 0 ? (
                      <p className="mt-3 text-sm text-muted-foreground">
                        No talks yet. Drop a PDF to add one.
                      </p>
                    ) : (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {catalog.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void assignTopicToMonth(item.id, expanded)
                            }
                            className="rounded-xl border bg-muted/50 px-3 py-2.5 text-left hover:bg-muted"
                          >
                            <p className="font-medium">{item.title}</p>
                          </button>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      className="mt-3 text-sm font-medium text-cyan-800 underline"
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
                  "flex h-9 w-full items-center justify-center rounded-xl border-2 border-dashed px-3 text-center transition",
                  dragOver
                    ? "border-cyan-400 bg-cyan-50/80"
                    : "border-cyan-200/70 bg-white/50 hover:border-cyan-300",
                )}
              >
                <p>
                  <span className="font-medium">
                    {busy ? "Saving PDF…" : "Drop a PDF here"}
                  </span>
                  {busy ? null : (
                    <span className="text-muted-foreground">
                      {" "}
                      or tap a file, then pick the month.
                    </span>
                  )}
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
                ? `${pendingFile.name} — tap an empty month. Months with a talk stay locked.`
                : "Tap an empty month. Months with a talk stay locked."}
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
            {yearMonths(assignYear).map((key) => {
              const takenId = monthTopic(shop.store.schedule, key);
              const taken = takenId
                ? getTopic(takenId, catalog)
                : null;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={busy || Boolean(taken)}
                  onClick={() => void assignFileToMonth(key)}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-left text-sm transition",
                    taken
                      ? "cursor-not-allowed border-transparent bg-muted/40 text-muted-foreground"
                      : key === shop.monthKey
                        ? "border-cyan-400/80 bg-cyan-50/80"
                        : "border-transparent bg-muted/60 hover:bg-muted",
                  )}
                >
                  <p className="font-medium">{formatMonthShort(key)}</p>
                  <p className="text-xs text-muted-foreground">
                    {taken
                      ? taken.shortTitle
                      : key === shop.monthKey
                        ? "Now"
                        : formatMonthName(key)}
                  </p>
                </button>
              );
            })}
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

      <Dialog
        open={clearMonth !== ""}
        onOpenChange={(open) => {
          if (!open) setClearMonth("");
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Delete this topic from the month?</DialogTitle>
            <DialogDescription>
              {clearMonth
                ? `${shop.formatMonthLabel(clearMonth)} will go back to empty so you can pick another talk. Signatures stay saved if you add the same talk later.`
                : "This month will go back to empty."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setClearMonth("")}
            >
              Keep it
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={() => void removeTopicFromMonth(clearMonth)}
            >
              Delete topic
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageFrame>
  );
}
