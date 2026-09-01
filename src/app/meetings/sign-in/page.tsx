"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DatePicker } from "@/components/date-picker";
import { SignaturePad } from "@/components/signature-pad";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BLANK_ROWS,
  employeesByDepartment,
} from "@/lib/employees";
import { useMeeting, type SignRow } from "@/lib/meeting-store";
import { getTopic } from "@/lib/topics";

function isSigned(sig: string) {
  return sig.startsWith("data:image");
}

type SignTarget =
  | { kind: "employee"; n: number; name: string; dept: string }
  | { kind: "trainer" };

export default function SignInPage() {
  const { meeting, update, ready } = useMeeting();
  const topic = getTopic(meeting.topic);
  const groups = employeesByDepartment();
  const [signing, setSigning] = useState<SignTarget | null>(null);

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

  const signed = meeting.rows.filter((r) => isSigned(r.sig)).length;
  const dialogName =
    signing?.kind === "employee"
      ? signing.name || rowState(signing.n).name || "Employee"
      : "Trainer";
  const dialogDept =
    signing?.kind === "employee"
      ? signing.dept || rowState(signing.n).dept
      : meeting.trainer || "Certifying person";
  const dialogValue =
    signing?.kind === "employee"
      ? rowState(signing.n).sig
      : meeting.trainerSig;

  function setDialogSig(sig: string) {
    if (!signing) return;
    if (signing.kind === "employee") patchRow(signing.n, { sig });
    else update({ trainerSig: sig });
  }

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
        <div className="grid gap-4 sm:grid-cols-3">
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
        <p className="print:hidden mb-1 text-sm text-muted-foreground">
          Tap a name to sign.
        </p>

        <div className="mt-2 overflow-x-auto">
          <table className="w-full border-collapse border border-black text-left text-[12pt]">
            <thead>
              <tr className="bg-black text-[10pt] text-white">
                <th className="w-10 px-2 py-1 font-bold">No.</th>
                <th className="px-2 py-1 font-bold">Employee name</th>
                <th className="w-40 px-2 py-1 font-bold">Department</th>
                <th className="w-56 px-2 py-1 font-bold">Employee signature</th>
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
                  onOpen={(row) => setSigning({ kind: "employee", ...row })}
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
                      <td className="border-b border-black px-2 py-0 text-[10pt] leading-tight">
                        {r.n}
                      </td>
                      <td className="border-b border-black px-2 py-0">
                        <input
                          className="w-full border-0 bg-transparent text-[12pt] leading-tight outline-none"
                          placeholder="Employee name"
                          value={state.name}
                          onChange={(e) =>
                            patchRow(r.n, { name: e.target.value })
                          }
                        />
                      </td>
                      <td className="border-b border-black px-2 py-0">
                        <input
                          className="w-full border-0 bg-transparent text-[12pt] leading-tight outline-none"
                          placeholder="Department"
                          value={state.dept}
                          onChange={(e) =>
                            patchRow(r.n, { dept: e.target.value })
                          }
                        />
                      </td>
                      <td className="border-b border-black px-1 py-0">
                        <SigPreview
                          sig={state.sig}
                          onOpen={() =>
                            setSigning({
                              kind: "employee",
                              n: r.n,
                              name: state.name,
                              dept: state.dept,
                            })
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
            the training on the subject listed.
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1">
              <Label className="text-[10pt] font-bold">Trainer signature</Label>
              <button
                type="button"
                onClick={() => setSigning({ kind: "trainer" })}
                className="min-h-8 rounded-md border border-black px-2 text-left print:hidden"
              >
                {isSigned(meeting.trainerSig) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={meeting.trainerSig}
                    alt="Trainer signature"
                    className="h-8 w-full object-contain object-left"
                  />
                ) : (
                  <span className="text-sm text-muted-foreground">
                    Tap to sign
                  </span>
                )}
              </button>
              {isSigned(meeting.trainerSig) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={meeting.trainerSig}
                  alt=""
                  className="hidden h-8 w-full object-contain object-left print:block"
                />
              ) : (
                <div className="hidden border-b border-black print:block" />
              )}
            </div>
            <div className="grid gap-1">
              <Label className="text-[10pt] font-bold">Title</Label>
              <Input
                value={meeting.trainerTitle}
                onChange={(e) => update({ trainerTitle: e.target.value })}
                className="h-9 text-base"
              />
            </div>
          </div>
        </section>
      </article>

      <Dialog
        open={signing !== null}
        onOpenChange={(open) => {
          if (!open) setSigning(null);
        }}
      >
        <DialogContent
          className="sm:max-w-xl"
          showCloseButton
        >
          <DialogHeader>
            <DialogTitle>Sign here</DialogTitle>
            <DialogDescription>
              {dialogName}
              {dialogDept ? ` · ${dialogDept}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-black bg-white p-2">
            {signing ? (
              <SignaturePad
                key={signing.kind === "employee" ? signing.n : "trainer"}
                size="dialog"
                value={dialogValue}
                onChange={setDialogSig}
              />
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              className="bg-[#003366] hover:bg-[#00264d]"
              onClick={() => setSigning(null)}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function SigPreview({
  sig,
  onOpen,
}: {
  sig: string;
  onOpen: () => void;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onOpen}
        className="flex h-8 w-full items-center print:hidden"
      >
        {isSigned(sig) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={sig}
            alt="Signature"
            className="h-8 w-full object-contain object-left"
          />
        ) : (
          <span className="text-xs text-muted-foreground">Tap name to sign</span>
        )}
      </button>
      {isSigned(sig) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={sig}
          alt=""
          className="hidden h-8 w-full object-contain object-left print:block"
        />
      ) : (
        <div className="mx-1 hidden border-b border-black print:block" />
      )}
    </>
  );
}

function GroupRows({
  department,
  count,
  rows,
  rowState,
  onOpen,
}: {
  department: string;
  count: number;
  rows: { n: number; name: string; dept: string }[];
  rowState: (n: number) => SignRow;
  onOpen: (row: { n: number; name: string; dept: string }) => void;
}) {
  return (
    <>
      <tr className="bg-neutral-200">
        <td colSpan={4} className="border-b border-black px-2 py-0.5 text-[11pt] font-bold">
          {department} — {count} employees
        </td>
      </tr>
      {rows.map((r, i) => {
        const state = rowState(r.n);
        return (
          <tr key={r.n} className={i % 2 ? "bg-neutral-100" : "bg-white"}>
            <td className="border-b border-black px-2 py-0 text-[10pt] leading-tight">{r.n}</td>
            <td className="border-b border-black px-2 py-0 text-[12pt] leading-tight">
              <button
                type="button"
                onClick={() => onOpen(r)}
                className="text-left font-medium text-[#003366] underline decoration-dotted print:text-black print:no-underline print:font-normal"
              >
                {r.name}
              </button>
            </td>
            <td className="border-b border-black px-2 py-0 text-[12pt] leading-tight">
              {r.dept}
            </td>
            <td className="border-b border-black px-1 py-0">
              <SigPreview sig={state.sig} onOpen={() => onOpen(r)} />
            </td>
          </tr>
        );
      })}
    </>
  );
}
