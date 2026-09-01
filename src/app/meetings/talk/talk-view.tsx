"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getTopic, TOPICS, type TopicId } from "@/lib/topics";
import { withBase } from "@/lib/base-path";
import { PageChrome } from "@/components/page-chrome";
import { buttonVariants } from "@/components/ui/button";

export function TalkView() {
  const searchParams = useSearchParams();
  const topicId = searchParams.get("topic") ?? undefined;
  const topic = getTopic(
    topicId && TOPICS.some((t) => t.id === topicId)
      ? (topicId as TopicId)
      : undefined,
  );

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 print:max-w-none print:px-0 print:py-0">
      <PageChrome title={topic.title}>
        <a
          href={withBase(topic.pdf)}
          target="_blank"
          rel="noreferrer"
          className={buttonVariants({ variant: "outline" })}
        >
          PDF
        </a>
        <Link href="/meetings" className={buttonVariants({ variant: "outline" })}>
          Setup
        </Link>
        <Link href="/meetings/sign-in" className={buttonVariants()}>
          Sign-in
        </Link>
      </PageChrome>

      <article className="glass-panel space-y-8 rounded-3xl p-6 print:rounded-none print:bg-white print:p-0 print:shadow-none">
        <p className="text-sm leading-relaxed text-muted-foreground print:text-black">
          {topic.why}
        </p>

        <div className="grid gap-8 md:grid-cols-5">
          <section className="md:col-span-3">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Talking points
            </h2>
            <ol className="mt-3 list-decimal space-y-2.5 pl-5 text-sm leading-relaxed">
              {topic.talkingPoints.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </section>
          <section className="md:col-span-2">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              {topic.sideTitle}
            </h2>
            <ul className="mt-3 list-disc space-y-2.5 pl-5 text-sm leading-relaxed">
              {topic.sideItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </div>

        <div className="grid gap-8 sm:grid-cols-2">
          <section>
            <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-emerald-800">
              Do
            </h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm">
              {topic.dos.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-red-800">
              Don&apos;t
            </h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm">
              {topic.donts.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </div>

        <section className="rounded-2xl bg-[#0b1220] px-5 py-4 text-white print:bg-black">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-cyan-200">
            Stop work if
          </h2>
          <p className="mt-2 text-sm leading-relaxed">{topic.stopWork}</p>
        </section>
      </article>
    </main>
  );
}
