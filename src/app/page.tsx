"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MonthCalendar } from "@/components/month-calendar";
import { Button, buttonVariants } from "@/components/ui/button";
import { sheetProgress, useMeeting } from "@/lib/meeting-store";
import {
  ingestPdf,
  packetUrl,
  topicSourceLabel,
} from "@/lib/packet";
import { topicForMonth } from "@/lib/shop-data";
import { getTopic } from "@/lib/topics";
import { useShopStore } from "@/lib/use-shop-store";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const router = useRouter();
  const { meeting, update, ready } = useMeeting();
  const shop = useShopStore();
  const catalog = shop.store.topics;
  const [picked, setPicked] = useState(meeting.topic);
  const [month, setMonth] = useState(shop.monthKey);
  const [year, setYear] = useState(() =>
    Number((meeting.month || shop.monthKey).slice(0, 4)),
  );
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const topic = getTopic(picked, catalog);
  const pickedProgress = progressFor(picked, month);

  function progressFor(topicId: string, monthKey: string) {
    if (!ready) return null;
    return sheetProgress(topicId, monthKey);
  }

  useEffect(() => {
    if (!ready) return;
    const nextMonth = meeting.month || shop.monthKey;
    setPicked(meeting.topic);
    setMonth(nextMonth);
    setYear(Number(nextMonth.slice(0, 4)));
  }, [ready, meeting.topic, meeting.month, shop.monthKey]);

  async function applyAndOpen(topicId: string, monthKey: string, pdf?: string) {
    const schedule = { ...shop.store.schedule, [monthKey]: topicId };
    update({ topic: topicId, month: monthKey });
    await shop.save({ schedule });
    const next = getTopic(topicId, shop.store.topics);
    router.push(
      packetUrl(pdf || next.pdf) ? "/meetings/packet" : "/meetings/sign-in",
    );
  }

  async function takeFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const created = await ingestPdf(file, catalog);
      await shop.save({ topics: [...catalog, created] });
      setPicked(created.id);
      setMonth(month);
      await applyAndOpen(created.id, month, created.pdf);
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
        Choose the talk
      </h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        Look at the year. Tap a month to see what was already signed or what’s
        coming up. Then open that packet and keep the same sign-in list.
      </p>

      <div className="mt-6">
        <MonthCalendar
          year={year}
          now={shop.monthKey}
          selected={month}
          schedule={shop.store.schedule}
          topics={catalog}
          ready={ready}
          onYearChange={setYear}
          onSelect={(key, topicId) => {
            setMonth(key);
            setPicked(topicId);
          }}
        />
      </div>

      <section className="mt-6 flex flex-wrap items-end justify-between gap-3">
        <p className="max-w-xl text-sm text-muted-foreground">
          {pickedProgress?.signed
            ? `${pickedProgress.signed} already signed on ${topic.shortTitle} for ${shop.formatMonthLabel(month)}. Open the same list and keep adding.`
            : month < shop.monthKey
              ? `${topic.shortTitle} in ${shop.formatMonthLabel(month)} has no signatures yet.`
              : month === shop.monthKey
                ? `${topic.shortTitle} is this month. Open the packet, then the sign-in list.`
                : `${topic.shortTitle} is planned for ${shop.formatMonthLabel(month)}.`}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="lg"
            disabled={busy}
            onClick={() => applyAndOpen(picked, month)}
          >
            {packetUrl(topic.pdf) ? "Open packet" : "Open sign-in"}
          </Button>
          <Link
            href="/meetings/sign-in"
            className={buttonVariants({ size: "lg", variant: "outline" })}
            onClick={() => update({ topic: picked, month })}
          >
            Skip to sign-in
          </Link>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Topics</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tap a topic to assign it to {shop.formatMonthLabel(month)}.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {catalog.map((item) => {
            const active = picked === item.id;
            const assigned = shop.months.filter(
              (key) => shop.store.schedule[key] === item.id,
            );
            const saved = progressFor(item.id, month);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setPicked(item.id)}
                className={cn(
                  "rounded-2xl border px-4 py-4 text-left transition",
                  active
                    ? "border-cyan-400/80 bg-cyan-50/80 ring-1 ring-cyan-300/70"
                    : "glass-panel border-transparent hover:-translate-y-0.5",
                )}
              >
                <p className="font-medium">{item.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {topicSourceLabel(item.source)}
                  {item.pdf ? " · PDF" : ""}
                  {assigned[0]
                    ? ` · ${shop.formatMonthLabel(assigned[0])}`
                    : ""}
                </p>
                {saved && saved.signed > 0 ? (
                  <p className="mt-2 text-sm text-cyan-900">
                    {saved.signed} signed — same list
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {shop.store.schedule[month] === item.id ||
                    (!shop.store.schedule[month] &&
                      topicForMonth(month) === item.id)
                      ? `Planned for ${shop.formatMonthLabel(month)}`
                      : "No signatures this month"}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <input
        ref={fileRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          void takeFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

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
          void takeFile(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "glass-panel mt-8 flex min-h-28 w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-8 text-center transition",
          dragOver
            ? "border-cyan-400 bg-cyan-50/80"
            : "border-transparent hover:border-cyan-200",
        )}
      >
        <p className="font-medium">
          {busy ? "Saving PDF…" : "Drop a PDF to add a topic"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Title comes from the file name. It lands on the selected month.
        </p>
      </button>
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
    </main>
  );
}
