"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { useCrew } from "@/lib/crew-store";
import { departmentProgress } from "@/lib/meeting-record";
import { useMeeting } from "@/lib/meeting-store";
import { withBase } from "@/lib/base-path";
import { getTopic, topicPdfHref } from "@/lib/topics";
import { useShopStore } from "@/lib/use-shop-store";
import { cn } from "@/lib/utils";

function packetHref(pdf: string) {
  const href = topicPdfHref(pdf);
  if (!href) return "";
  if (href.startsWith("http") || href.startsWith("/api/")) return href;
  return withBase(href);
}

export default function HomePage() {
  const router = useRouter();
  const { meeting, update, ready } = useMeeting();
  const { employees, ready: crewReady } = useCrew();
  const shop = useShopStore();
  const topic = getTopic(meeting.topic, shop.store.topics);
  const progress = departmentProgress(meeting, employees);
  const left = progress.reduce((sum, row) => sum + row.left, 0);
  const packet = packetHref(topic.pdf);

  function openDept(department: string) {
    update({ department });
    router.push("/meetings/sign-in");
  }

  if (!ready || !crewReady) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-10">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-10">
      <section className="glass-panel rounded-3xl p-6 sm:p-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          This month
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          {topic.shortTitle}
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          {left === 0
            ? "Everyone on the list has signed."
            : `${left} still need to sign. Catch a department when you have time.`}
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href={`/meetings/talk?topic=${meeting.topic}`}
            className={buttonVariants({ size: "lg" })}
          >
            Talk notes
          </Link>
          {packet ? (
            <a
              href={packet}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ size: "lg", variant: "outline" })}
            >
              PDF
            </a>
          ) : null}
          <Link
            href="/meetings"
            className={buttonVariants({ size: "lg", variant: "ghost" })}
          >
            Change topic
          </Link>
        </div>
      </section>

      <section className="mt-6">
        <div className="flex items-end justify-between gap-3 px-1">
          <h2 className="text-lg font-semibold">Departments</h2>
          <Link
            href="/meetings/record"
            className="text-sm text-cyan-800 hover:underline"
          >
            Who&apos;s left
          </Link>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {progress.map((row) => (
            <button
              key={row.department}
              type="button"
              onClick={() => openDept(row.department)}
              className={cn(
                "glass-panel rounded-2xl p-4 text-left transition hover:-translate-y-0.5",
                row.left === 0 && "opacity-70",
              )}
            >
              <p className="font-medium">{row.department}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {row.left === 0
                  ? `All ${row.total} signed`
                  : `${row.left} of ${row.total} still need it`}
              </p>
              <p className="mt-4 text-sm text-cyan-800">Sign this crew</p>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
