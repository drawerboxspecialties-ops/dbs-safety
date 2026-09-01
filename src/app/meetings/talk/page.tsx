import Link from "next/link";
import { notFound } from "next/navigation";
import { getTopic, TOPICS, type TopicId } from "@/lib/topics";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default async function TalkPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string }>;
}) {
  const { topic: topicId } = await searchParams;
  if (topicId && !TOPICS.some((t) => t.id === topicId)) notFound();
  const topic = getTopic(topicId as TopicId | undefined);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 print:max-w-none print:px-0 print:py-0">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <p className="text-sm font-semibold text-[#003366]">
            Safety Meeting App
          </p>
          <h1 className="text-2xl font-semibold">{topic.title}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={topic.pdf}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: "outline" })}
          >
            Download PDF
          </a>
          <Link
            href="/meetings"
            className={buttonVariants({ variant: "outline" })}
          >
            Back to setup
          </Link>
          <Link
            href="/meetings/sign-in"
            className={cn(
              buttonVariants(),
              "bg-[#003366] hover:bg-[#00264d]",
            )}
          >
            Continue to sign-in
          </Link>
        </div>
      </div>

      <article className="overflow-hidden rounded-xl border bg-white shadow-sm print:rounded-none print:border-0 print:shadow-none">
        <header className="bg-[#1b232c] px-5 py-4 text-white print:bg-black">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold tracking-[0.12em] text-amber-300">
                DRAWER BOX SPECIALTIES · SAFETY MEETING
              </p>
              <h2 className="mt-1 text-2xl font-semibold">{topic.title}</h2>
            </div>
            <Badge variant="secondary" className="bg-amber-400 text-[#1b232c]">
              {topic.minutes}
            </Badge>
          </div>
        </header>

        <div className="space-y-4 p-5">
          <section className="rounded-lg border bg-amber-50/70 p-4">
            <h3 className="text-xs font-bold tracking-wide text-amber-900">
              WHY THIS MEETING
            </h3>
            <p className="mt-1 text-sm leading-relaxed">{topic.why}</p>
          </section>

          <div className="grid gap-4 md:grid-cols-5">
            <section className="rounded-lg border p-4 md:col-span-3">
              <h3 className="text-xs font-bold tracking-wide">
                TALKING POINTS
              </h3>
              <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-relaxed">
                {topic.talkingPoints.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </section>
            <section className="rounded-lg border bg-sky-50/70 p-4 md:col-span-2">
              <h3 className="text-xs font-bold tracking-wide">
                {topic.sideTitle.toUpperCase()}
              </h3>
              <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed">
                {topic.sideItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <section className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-4">
              <h3 className="text-xs font-bold tracking-wide text-emerald-900">
                DO
              </h3>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm">
                {topic.dos.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
            <section className="rounded-lg border border-red-200 bg-red-50/80 p-4">
              <h3 className="text-xs font-bold tracking-wide text-red-900">
                DON&apos;T
              </h3>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm">
                {topic.donts.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          </div>

          <section className="rounded-lg bg-[#3a1212] px-4 py-3 text-white">
            <h3 className="text-xs font-bold tracking-wide text-amber-300">
              STOP WORK IF
            </h3>
            <p className="mt-1 text-sm">{topic.stopWork}</p>
          </section>
        </div>
      </article>
    </main>
  );
}
