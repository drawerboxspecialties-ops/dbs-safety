"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { useMeeting } from "@/lib/meeting-store";
import {
  ingestPdf,
  packetUrl,
  topicSourceLabel,
} from "@/lib/packet";
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
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const topic = getTopic(picked, catalog);

  useEffect(() => {
    if (!ready) return;
    setPicked(meeting.topic);
    setMonth(shop.monthKey);
  }, [ready, meeting.topic, shop.monthKey]);

  async function applyAndOpen(topicId: string, monthKey: string, pdf?: string) {
    const schedule = { ...shop.store.schedule, [monthKey]: topicId };
    update({ topic: topicId });
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
      setMonth(shop.monthKey);
      await applyAndOpen(created.id, shop.monthKey, created.pdf);
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
        Pick a packet or drop a PDF. Choose the month. Then the packet and that
        topic’s sign-in sheet.
      </p>

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
          "glass-panel mt-6 flex min-h-36 w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-8 text-center transition",
          dragOver
            ? "border-cyan-400 bg-cyan-50/80"
            : "border-transparent hover:border-cyan-200",
        )}
      >
        <p className="font-medium">
          {busy ? "Saving PDF…" : "Drop a PDF here"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Or tap to choose a file. Title comes from the file name.
        </p>
      </button>
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Topics</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {catalog.map((item) => {
            const active = picked === item.id;
            const assigned = shop.months.filter(
              (key) => shop.store.schedule[key] === item.id,
            );
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
              </button>
            );
          })}
        </div>
      </section>

      <section className="glass-panel mt-8 rounded-3xl p-5 sm:p-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Month for this topic
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {shop.months.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setMonth(key)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition",
                month === key
                  ? "border-cyan-400/80 bg-cyan-50/80 text-cyan-950 ring-1 ring-cyan-300/70"
                  : "border-transparent bg-white/60 hover:bg-white",
              )}
            >
              {shop.formatMonthLabel(key)}
              {key === shop.monthKey ? " · now" : ""}
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {topic.shortTitle} → {shop.formatMonthLabel(month)}. Next: the PDF,
          then that topic’s sign-in sheet.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
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
            onClick={() => update({ topic: picked })}
          >
            Skip to sign-in
          </Link>
        </div>
      </section>
    </main>
  );
}
