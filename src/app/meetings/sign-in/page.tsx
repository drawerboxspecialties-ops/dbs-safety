"use client";

import Link from "next/link";
import { useMemo } from "react";
import { DatePicker } from "@/components/date-picker";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BLANK_ROWS,
  employeesByDepartment,
} from "@/lib/employees";
import { useMeeting, type SignRow } from "@/lib/meeting-store";
import { getTopic } from "@/lib/topics";

function stampNow() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

export default function SignInPage() {
  const { meeting, update, ready } = useMeeting();
  const topic = getTopic(meeting.topic);
  const groups = employeesByDepartment();

  const roster = useMemo(() => {
    const rows: { n: number; name: string; dept: string; extra: boolean }[] = [];
    let n = 0;
    for (const group of groups) {
      for (const person of group.people) {
        n += 1;
        rows.push({
          n,
          name: person.name,
          dept: person.department,
          extra: false,
        });
      }
    }
    for (let i = 0; i < BLANK_ROWS; i += 1) {
      n += 1;
      rows.push({ n, name: "", dept: "", extra: true });
    }
    return rows;
  }, [groups]);

  function rowState(n: number): SignRow {
    return (
      meeting.rows.find((r) => r.n === String(n)) ?? {
        n: String(n),
        name: "",
        dept: "",
        sig: "",
        time: "",
      }
    );
  }

  function patchRow(n: number, patch: Partial<SignRow>) {
    const next = [...meeting.rows];
    const i = next.findIndex((r) => r.n === String(n));
    const current = rowState(n);
    const updated = { ...current, ...patch };
    if (i >= 0) next[i] = updated;
    else next.push(updated);
    update({ rows: next });
  }

  const signed = meeting.rows.filter((r) => r.sig.trim()).length;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 print:max-w-none print:px-0 print:py-0">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <p className="text-sm font-semibold text-[#003366]">
            Safety Meeting App
          </p>
          <h1 className="text-2xl font-semibold">Training sign-in</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/meetings" className={buttonVariants({ variant: "outline" })}>
            Setup
          </Link>
          <Link
            href={`/meetings/talk?topic=${meeting.topic}`}
            className={buttonVariants({ variant: "outline" })}
          >
            Talk
          </Link>
          <Button
            type="button"
            className="bg-[#003366] hover:bg-[#00264d]"
            onClick={() => window.print()}
          >
            Print / save PDF
          </Button>
        </div>
      </div>

      <article className="osha-sheet rounded-xl border bg-white p-4 shadow-sm sm:p-6 print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <header className="border-2 border-black p-3">
          <p className="text-[10pt] font-bold tracking-wide uppercase">
            Drawer Box Specialties · Drawer boxes · Cabinets · Doors
          </p>
          <h2 className="mt-1 text-[16pt] font-bold leading-tight">
            Certification of training
          </h2>
          <p className="mt-2 text-[10pt] leading-snug">
            This document is a written certification of training under 29 CFR
            1910.132(f)(4) (PPE). It also records attendance for other safety
            talks, including material handling. It lists each employee, the
            training date, and the subject.
          </p>
        </header>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="grid gap-1">
            <Label className="text-[10pt] font-bold">Date of training</Label>
            {ready ? (
              <DatePicker
                value={meeting.date}
                onChange={(date) => update({ date })}
              />
            ) : (
              <div className="h-11 rounded-md border" />
            )}
          </div>
          <div className="grid gap-1">
            <Label className="text-[10pt] font-bold">
              Subject of certification
            </Label>
            <Input
              value={topic.title}
              readOnly
              className="h-11 text-base"
            />
          </div>
          <div className="grid gap-1">
            <Label className="text-[10pt] font-bold">
              Trainer / certifying person
            </Label>
            <Input
              value={meeting.trainer}
              onChange={(e) => update({ trainer: e.target.value })}
              className="h-11 text-base"
            />
          </div>
        </div>

        <p className="mt-4 text-[12pt] font-bold">{signed} employees signed</p>

        <div className="mt-2 overflow-x-auto">
          <table className="w-full border-collapse border border-black text-left text-[12pt]">
            <thead>
              <tr className="bg-black text-[10pt] text-white">
                <th className="w-10 px-2 py-1.5 font-bold">No.</th>
                <th className="px-2 py-1.5 font-bold">Employee name</th>
                <th className="w-40 px-2 py-1.5 font-bold">Department</th>
                <th className="w-52 px-2 py-1.5 font-bold">Employee signature</th>
                <th className="w-28 px-2 py-1.5 font-bold">Time</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <GroupRows
                  key={group.department}
                  department={group.department}
                  count={group.people.length}
                  rows={roster.filter(
                    (r) => !r.extra && r.dept === group.department,
                  )}
                  rowState={rowState}
                  patchRow={patchRow}
                />
              ))}
              {roster
                .filter((r) => r.extra)
                .map((r, i) => {
                  const state = rowState(r.n);
                  return (
                    <tr
                      key={r.n}
                      className={i % 2 ? "bg-neutral-100" : "bg-white"}
                    >
                      <td className="border-b border-black px-2 py-1 text-[10pt]">
                        {r.n}
                      </td>
                      <td className="border-b border-black px-2 py-1">
                        <input
                          className="w-full border-0 bg-transparent text-[12pt] outline-none"
                          placeholder="Employee name"
                          value={state.name}
                          onChange={(e) =>
                            patchRow(r.n, { name: e.target.value })
                          }
                        />
                      </td>
                      <td className="border-b border-black px-2 py-1">
                        <input
                          className="w-full border-0 bg-transparent text-[12pt] outline-none"
                          placeholder="Department"
                          value={state.dept}
                          onChange={(e) =>
                            patchRow(r.n, { dept: e.target.value })
                          }
                        />
                      </td>
                      <td className="border-b border-black px-2 py-1">
                        <input
                          className="w-full border-0 border-b border-black bg-transparent text-[12pt] outline-none"
                          value={state.sig}
                          onChange={(e) =>
                            patchRow(r.n, {
                              sig: e.target.value,
                              time: state.time || (e.target.value ? stampNow() : ""),
                            })
                          }
                        />
                      </td>
                      <td className="border-b border-black px-2 py-1">
                        <input
                          type="time"
                          className="w-full border-0 bg-transparent text-[12pt] outline-none"
                          value={state.time}
                          onChange={(e) =>
                            patchRow(r.n, { time: e.target.value })
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        <section className="mt-4 border-2 border-black p-3">
          <h3 className="text-[12pt] font-bold uppercase">
            Trainer certification — 29 CFR 1910.132(f)(4)
          </h3>
          <p className="mt-2 text-[12pt] leading-snug">
            I certify that each employee named above has received and understood
            the training on the subject listed, including when PPE is necessary,
            what PPE is required, how to use and care for it, its limits, and
            (for material handling) safe lifting, stacking, and powered
            equipment rules.
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1">
              <Label className="text-[10pt] font-bold">Trainer signature</Label>
              <Input
                value={meeting.trainerSig}
                onChange={(e) => update({ trainerSig: e.target.value })}
                className="h-11 text-base"
              />
            </div>
            <div className="grid gap-1">
              <Label className="text-[10pt] font-bold">Title</Label>
              <Input
                value={meeting.trainerTitle}
                onChange={(e) => update({ trainerTitle: e.target.value })}
                className="h-11 text-base"
              />
            </div>
          </div>
        </section>
      </article>
    </main>
  );
}

function GroupRows({
  department,
  count,
  rows,
  rowState,
  patchRow,
}: {
  department: string;
  count: number;
  rows: { n: number; name: string; dept: string }[];
  rowState: (n: number) => SignRow;
  patchRow: (n: number, patch: Partial<SignRow>) => void;
}) {
  return (
    <>
      <tr className="bg-neutral-200">
        <td colSpan={5} className="border-b border-black px-2 py-1.5 text-[12pt] font-bold">
          {department} — {count} employees
        </td>
      </tr>
      {rows.map((r, i) => {
        const state = rowState(r.n);
        return (
          <tr key={r.n} className={i % 2 ? "bg-neutral-100" : "bg-white"}>
            <td className="border-b border-black px-2 py-1 text-[10pt]">{r.n}</td>
            <td className="border-b border-black px-2 py-1 text-[12pt]">
              {r.name}
            </td>
            <td className="border-b border-black px-2 py-1 text-[12pt]">
              {r.dept}
            </td>
            <td className="border-b border-black px-2 py-1">
              <input
                className="w-full border-0 border-b border-black bg-transparent text-[12pt] outline-none"
                value={state.sig}
                onChange={(e) =>
                  patchRow(r.n, {
                    sig: e.target.value,
                    time: state.time || (e.target.value ? stampNow() : ""),
                  })
                }
              />
            </td>
            <td className="border-b border-black px-2 py-1">
              <input
                type="time"
                className="w-full border-0 bg-transparent text-[12pt] outline-none"
                value={state.time}
                onChange={(e) => patchRow(r.n, { time: e.target.value })}
              />
            </td>
          </tr>
        );
      })}
    </>
  );
}
