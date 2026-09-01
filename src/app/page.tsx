"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MonthCalendar } from "@/components/month-calendar";
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
  const router = useRouter();
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

  async function applyAndOpen(topicId: string, monthKey: string, pdf?: string) {
    const schedule = { ...shop.store.schedule, [monthKey]: topicId };
    update({ topic: topicId, month: monthKey });
    setMonth(monthKey);
    setYear(Number(monthKey.slice(0, 4)));
    await shop.save({ schedule });
    const next = getTopic(topicId, shop.store.topics);
    router.push(
      sheetHref(
        packetUrl(pdf || next.pdf) ? "/meetings/packet" : "/meetings/sign-in",
        topicId,
        monthKey,
      ),
    );
  }

  function queueFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setPendingFile(file);
    setAssignYear(year);
  }

  async function assignFileToMonth(monthKey: string) {
    if (!pendingFile) return;
    setBusy(true);
    setError("");
    try {
      const created = await ingestPdf(pendingFile, catalog);
      await shop.save({ topics: [...catalog, created] });
      setPendingFile(null);
      await applyAndOpen(created.id, monthKey, created.pdf);
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
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-10">
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
          selected={month}
          schedule={shop.store.schedule}
          topics={catalog}
          ready={ready}
          disabled={busy}
          onYearChange={setYear}
          onSelect={(key, topicId) => {
            void applyAndOpen(topicId, key);
          }}
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
