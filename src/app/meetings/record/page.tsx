"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageChrome } from "@/components/page-chrome";
import { Button, buttonVariants } from "@/components/ui/button";
import { useCrew } from "@/lib/crew-store";
import { useMeeting } from "@/lib/meeting-store";
import {
  EMPLOYER,
  TRAINER_CERT,
  WORKPLACE,
  buildRoster,
  formatMeetingDate,
  isSigned,
  loadFiledMeetings,
  makeupEmployees,
  recordGaps,
  saveFiledMeeting,
  snapshotMeeting,
  trainedEmployees,
  type FiledMeeting,
} from "@/lib/meeting-record";
import { getTopic } from "@/lib/topics";

export default function TrainingRecordPage() {
  const { meeting, ready } = useMeeting();
  const { employees, ready: crewReady } = useCrew();
  const topic = getTopic(meeting.topic);
  const [filed, setFiled] = useState<FiledMeeting[]>([]);
  const [savedNote, setSavedNote] = useState("");
  const [view, setView] = useState<"live" | string>("live");

  useEffect(() => {
    setFiled(loadFiledMeetings());
  }, []);

  const roster = useMemo(() => buildRoster(employees), [employees]);
  const trained = useMemo(
    () => trainedEmployees(meeting, roster),
    [meeting, roster],
  );
  const makeup = useMemo(
    () => makeupEmployees(meeting, roster),
    [meeting, roster],
  );
  const gaps = useMemo(() => recordGaps(meeting, roster), [meeting, roster]);
  const selected = view === "live" ? null : filed.find((r) => r.id === view);

  function fileRecord() {
    const snap = snapshotMeeting(meeting, employees);
    const next = saveFiledMeeting(snap);
    setFiled(next);
    setSavedNote(
      `Saved ${formatMeetingDate(snap.date)} ${snap.subject} — ${snap.trained.length} trained.`,
    );
  }

  if (!ready || !crewReady) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-6">
        <p className="text-sm text-muted-foreground">Loading record…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 print:max-w-none print:px-0 print:py-0">
      <PageChrome title="Record">
        <Link href="/meetings" className={buttonVariants({ variant: "outline" })}>
          Setup
        </Link>
        <Link
          href="/meetings/sign-in"
          className={buttonVariants({ variant: "outline" })}
        >
          Sign-in
        </Link>
        {view === "live" ? (
          <Button
            type="button"
            variant="outline"
            onClick={fileRecord}
            disabled={gaps.length > 0}
          >
            Save
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={() => setView("live")}>
            This meeting
          </Button>
        )}
        <Button type="button" onClick={() => window.print()}>
          Print
        </Button>
      </PageChrome>
      {savedNote ? (
        <p className="print:hidden mb-4 text-sm text-emerald-800">{savedNote}</p>
      ) : null}

      {selected ? (
        <FiledView record={selected} />
      ) : (
        <article className="osha-sheet glass-panel rounded-3xl p-4 sm:p-6 print:rounded-none print:border-0 print:bg-white print:p-0 print:shadow-none">
          <header className="border-b border-black pb-3">
            <p className="text-[12pt] font-bold">{EMPLOYER}</p>
            <h2 className="text-[16pt] font-bold">Written training record</h2>
            <p className="text-[11pt]">{WORKPLACE}</p>
          </header>

          <dl className="mt-3 grid gap-2 text-[12pt] sm:grid-cols-2">
            <div>
              <dt className="text-[10pt] font-bold">Date of training</dt>
              <dd>{formatMeetingDate(meeting.date) || "—"}</dd>
            </div>
            <div>
              <dt className="text-[10pt] font-bold">Subject of certification</dt>
              <dd>{topic.title}</dd>
            </div>
            <div>
              <dt className="text-[10pt] font-bold">Trainer / certifying person</dt>
              <dd>{meeting.trainer || "—"}</dd>
            </div>
            <div>
              <dt className="text-[10pt] font-bold">Title</dt>
              <dd>{meeting.trainerTitle || "—"}</dd>
            </div>
          </dl>

          <section className="mt-4">
            <h3 className="text-[12pt] font-bold">Subject matter covered</h3>
            <ol className="mt-1 list-decimal space-y-1 pl-5 text-[11pt] leading-snug">
              {topic.talkingPoints.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </section>

          <section className="mt-4">
            <h3 className="text-[12pt] font-bold">
              Employees trained — {trained.length}
            </h3>
            <p className="mb-1 text-[10pt]">
              Each person signed to show they received and understood this
              training.
            </p>
            {trained.length === 0 ? (
              <p className="text-[11pt]">No employee signatures yet.</p>
            ) : (
              <table className="mt-1 w-full border-collapse border border-black text-left text-[11pt]">
                <thead>
                  <tr className="bg-black text-white">
                    <th className="px-2 py-1">Employee name</th>
                    <th className="w-40 px-2 py-1">Department</th>
                    <th className="w-56 px-2 py-1">Signature</th>
                  </tr>
                </thead>
                <tbody>
                  {trained.map((row) => (
                    <tr key={row.n}>
                      <td className="border-b border-black px-2 py-0.5">
                        {row.name}
                      </td>
                      <td className="border-b border-black px-2 py-0.5">
                        {row.dept}
                      </td>
                      <td className="border-b border-black px-1 py-0.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={row.sig}
                          alt=""
                          className="h-8 w-full object-contain object-left"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="mt-4">
            <h3 className="text-[12pt] font-bold">
              Need this talk — {makeup.length}
            </h3>
            <p className="mb-1 text-[10pt]">
              Named on the crew list or sign-in, but not signed. Schedule a
              make-up before they do the work this talk covers.
            </p>
            {makeup.length === 0 ? (
              <p className="text-[11pt]">Everyone named has signed.</p>
            ) : (
              <ul className="columns-1 text-[11pt] sm:columns-2">
                {makeup.map((row) => (
                  <li key={`${row.name}-${row.dept}`}>
                    {row.name}
                    {row.dept ? ` · ${row.dept}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-4 border-2 border-black p-3">
            <h3 className="text-[12pt] font-bold uppercase">
              Trainer certification
            </h3>
            <p className="mt-2 text-[12pt] leading-snug">{TRAINER_CERT}</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[10pt] font-bold">Trainer signature</p>
                {isSigned(meeting.trainerSig) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={meeting.trainerSig}
                    alt="Trainer signature"
                    className="h-10 w-full object-contain object-left"
                  />
                ) : (
                  <div className="mt-4 border-b border-black" />
                )}
              </div>
              <div>
                <p className="text-[10pt] font-bold">Printed name / title</p>
                <p className="mt-2 text-[12pt]">
                  {[meeting.trainer, meeting.trainerTitle]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
              </div>
            </div>
          </section>
        </article>
      )}

      <section className="print:hidden mt-8">
        <h2 className="text-lg font-semibold">Shop file</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Saved copies stay on this device. Print the live record for the paper
          file. Keep training records with the safety-meeting folder.
        </p>
        {filed.length === 0 ? (
          <p className="mt-3 text-sm">No meetings saved yet.</p>
        ) : (
          <ul className="mt-3 divide-y rounded-lg border">
            {filed.map((record) => (
              <li
                key={record.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
              >
                <div>
                  <p className="font-medium">
                    {formatMeetingDate(record.date)} · {record.subject}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {record.trained.length} trained
                    {record.makeup.length
                      ? ` · ${record.makeup.length} need make-up`
                      : ""}
                    {record.trainer ? ` · ${record.trainer}` : ""}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setView(record.id)}
                >
                  Open
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function FiledView({ record }: { record: FiledMeeting }) {
  return (
        <article className="osha-sheet glass-panel rounded-3xl p-4 sm:p-6 print:rounded-none print:border-0 print:bg-white print:p-0 print:shadow-none">
      <header className="border-b border-black pb-3">
        <p className="text-[12pt] font-bold">{EMPLOYER}</p>
        <h2 className="text-[16pt] font-bold">Written training record</h2>
        <p className="text-[11pt]">{WORKPLACE}</p>
        <p className="mt-1 text-[10pt]">
          Filed {formatMeetingDate(record.filedAt)}
        </p>
      </header>
      <dl className="mt-3 grid gap-2 text-[12pt] sm:grid-cols-2">
        <div>
          <dt className="text-[10pt] font-bold">Date of training</dt>
          <dd>{formatMeetingDate(record.date)}</dd>
        </div>
        <div>
          <dt className="text-[10pt] font-bold">Subject of certification</dt>
          <dd>{record.subject}</dd>
        </div>
        <div>
          <dt className="text-[10pt] font-bold">Trainer / certifying person</dt>
          <dd>{record.trainer || "—"}</dd>
        </div>
        <div>
          <dt className="text-[10pt] font-bold">Title</dt>
          <dd>{record.trainerTitle || "—"}</dd>
        </div>
      </dl>
      <section className="mt-4">
        <h3 className="text-[12pt] font-bold">Subject matter covered</h3>
        <ol className="mt-1 list-decimal space-y-1 pl-5 text-[11pt] leading-snug">
          {record.topicsCovered.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </section>
      <section className="mt-4">
        <h3 className="text-[12pt] font-bold">
          Employees trained — {record.trained.length}
        </h3>
        <ul className="mt-1 columns-1 text-[11pt] sm:columns-2">
          {record.trained.map((row) => (
            <li key={`${row.name}-${row.dept}`}>
              {row.name}
              {row.dept ? ` · ${row.dept}` : ""}
            </li>
          ))}
        </ul>
      </section>
      <section className="mt-4">
        <h3 className="text-[12pt] font-bold">
          Need this talk — {record.makeup.length}
        </h3>
        {record.makeup.length === 0 ? (
          <p className="text-[11pt]">Everyone named has signed.</p>
        ) : (
          <ul className="mt-1 columns-1 text-[11pt] sm:columns-2">
            {record.makeup.map((row) => (
              <li key={`${row.name}-${row.dept}`}>
                {row.name}
                {row.dept ? ` · ${row.dept}` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="mt-4 border-2 border-black p-3">
        <h3 className="text-[12pt] font-bold uppercase">Trainer certification</h3>
        <p className="mt-2 text-[12pt] leading-snug">{TRAINER_CERT}</p>
        <p className="mt-3 text-[12pt]">
          {[record.trainer, record.trainerTitle].filter(Boolean).join(" · ") ||
            "—"}
        </p>
      </section>
    </article>
  );
}
