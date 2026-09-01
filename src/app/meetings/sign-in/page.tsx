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
import { useCrew } from "@/lib/crew-store";
import { departmentOptions, EMPLOYEES } from "@/lib/employees";
import {
  EMPLOYER,
  TRAINER_CERT,
  buildRoster,
  isSigned,
  recordGaps,
  rowState as meetingRow,
  type RosterPerson,
} from "@/lib/meeting-record";
import { useMeeting, type SignRow } from "@/lib/meeting-store";
import { getTopic } from "@/lib/topics";

type SignTarget =
  | { kind: "employee"; person: RosterPerson }
  | { kind: "trainer" };

const OTHER = "__other";

export default function SignInPage() {
  const { meeting, update, ready } = useMeeting();
  const {
    employees,
    ready: crewReady,
    add,
    remove,
    saveAsDefault,
    restoreOriginal,
  } = useCrew();
  const topic = getTopic(meeting.topic);
  const groups = useMemo(() => {
    const order = departmentOptions(employees);
    return order
      .map((department) => ({
        department,
        people: employees.filter((e) => e.department === department),
      }))
      .filter((g) => g.people.length > 0);
  }, [employees]);
  const [signing, setSigning] = useState<SignTarget | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDept, setNewDept] = useState<string>(departmentOptions()[0]);
  const [customDept, setCustomDept] = useState("");
  const [listNote, setListNote] = useState("");

  const roster = useMemo(() => buildRoster(employees), [employees]);
  const gaps = useMemo(
    () => recordGaps(meeting, roster),
    [meeting, roster],
  );
  const departments = departmentOptions(employees);

  function rowState(person: RosterPerson): SignRow {
    return meetingRow(meeting, person);
  }

  function patchRow(person: RosterPerson, patch: Partial<SignRow>) {
    const next = [...meeting.rows];
    const current = rowState(person);
    const updated = {
      ...current,
      id: person.id,
      n: String(person.n),
      ...patch,
    };
    const i = next.findIndex(
      (r) => (r.id && r.id === person.id) || r.n === String(person.n),
    );
    if (i >= 0) next[i] = updated;
    else next.push(updated);
    update({ rows: next });
  }

  function chosenDept() {
    return newDept === OTHER ? customDept.trim() : newDept;
  }

  function addEmployee() {
    const person = add(newName, chosenDept());
    if (!person) return;
    setNewName("");
    setCustomDept("");
    setAdding(false);
    setListNote(`${person.name} added to the default list.`);
  }

  function addFromBlank(person: RosterPerson) {
    const state = rowState(person);
    const added = add(state.name || person.name, state.dept || person.dept);
    if (!added) return;
    const next = meeting.rows.filter(
      (r) => r.id !== person.id && r.n !== String(person.n),
    );
    if (state.sig || state.name) {
      next.push({
        id: added.id,
        n: "",
        name: added.name,
        dept: added.department,
        sig: state.sig,
      });
    }
    update({ rows: next });
    setListNote(`${added.name} added to the default list.`);
  }

  function removeEmployee(id: string, name: string) {
    if (!window.confirm(`Remove ${name} from the default sign-in list?`)) return;
    remove(id);
    update({
      rows: meeting.rows.filter((r) => r.id !== id && r.name !== name),
    });
    setListNote(`${name} removed from the default list.`);
  }

  function saveList() {
    saveAsDefault(employees);
    setListNote(`Default list saved — ${employees.length} employees.`);
  }

  function restoreList() {
    if (
      !window.confirm(
        "Restore the original payroll crew list? Added names will be removed.",
      )
    ) {
      return;
    }
    restoreOriginal();
    setListNote(
      `Original list restored — ${EMPLOYEES.length} employees.`,
    );
  }

  const signed = meeting.rows.filter((r) => isSigned(r.sig)).length;
  const dialogName =
    signing?.kind === "employee"
      ? signing.person.name ||
        rowState(signing.person).name ||
        "Employee"
      : "Trainer";
  const dialogDept =
    signing?.kind === "employee"
      ? signing.person.dept || rowState(signing.person).dept
      : meeting.trainer || "Certifying person";
  const dialogValue =
    signing?.kind === "employee"
      ? rowState(signing.person).sig
      : meeting.trainerSig;

  function setDialogSig(sig: string) {
    if (!signing) return;
    if (signing.kind === "employee") patchRow(signing.person, { sig });
    else update({ trainerSig: sig });
  }

  if (!ready || !crewReady) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-6">
        <p className="text-sm text-muted-foreground">Loading sign-in…</p>
      </main>
    );
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
          <Link
            href="/meetings/record"
            className={buttonVariants({ variant: "outline" })}
          >
            Training record
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

      {gaps.length > 0 ? (
        <p className="print:hidden mb-3 text-sm text-muted-foreground">
          Training record still needs: {gaps.join(", ")}.
        </p>
      ) : (
        <p className="print:hidden mb-3 text-sm text-emerald-800">
          Date, subject, trainer, and signatures are on file. Open the training
          record to print or save it.
        </p>
      )}

      <article className="osha-sheet rounded-xl border bg-white p-4 shadow-sm sm:p-6 print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <div className="mb-3 hidden print:block">
          <p className="text-[12pt] font-bold">{EMPLOYER}</p>
          <p className="text-[12pt]">Training sign-in</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-1">
            <Label className="text-[10pt] font-bold">Date of training</Label>
            <DatePicker
              value={meeting.date}
              onChange={(date) => update({ date })}
            />
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

        <div className="mt-4 flex flex-wrap items-end justify-between gap-2">
          <p className="text-[12pt] font-bold">
            {signed} employees signed · {employees.length} on default list
          </p>
          <div className="print:hidden flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setAdding(true)}>
              Add employee
            </Button>
            <Button type="button" variant="outline" onClick={saveList}>
              Save as default list
            </Button>
            <Button type="button" variant="ghost" onClick={restoreList}>
              Restore original
            </Button>
          </div>
        </div>
        <p className="print:hidden mb-1 text-sm text-muted-foreground">
          Tap a name to sign. Add or remove people, then save the list as the
          default for the next meeting.
        </p>
        {listNote ? (
          <p className="print:hidden mb-2 text-sm text-emerald-800">{listNote}</p>
        ) : null}

        <div className="mt-2 overflow-x-auto">
          <table className="w-full border-collapse border border-black text-left text-[12pt]">
            <thead>
              <tr className="bg-black text-[10pt] text-white">
                <th className="w-10 px-2 py-1 font-bold">No.</th>
                <th className="px-2 py-1 font-bold">Employee name</th>
                <th className="w-40 px-2 py-1 font-bold">Department</th>
                <th className="w-56 px-2 py-1 font-bold">Employee signature</th>
                <th className="print:hidden w-16 px-2 py-1 font-bold">List</th>
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
                  onOpen={(person) => setSigning({ kind: "employee", person })}
                  onRemove={removeEmployee}
                />
              ))}
              {roster
                .filter((r) => r.extra)
                .map((r, i) => {
                  const state = rowState(r);
                  return (
                    <tr
                      key={r.id}
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
                            patchRow(r, { name: e.target.value })
                          }
                        />
                      </td>
                      <td className="border-b border-black px-2 py-0">
                        <input
                          className="w-full border-0 bg-transparent text-[12pt] leading-tight outline-none"
                          placeholder="Department"
                          value={state.dept}
                          onChange={(e) =>
                            patchRow(r, { dept: e.target.value })
                          }
                        />
                      </td>
                      <td className="border-b border-black px-1 py-0">
                        <SigPreview
                          sig={state.sig}
                          onOpen={() =>
                            setSigning({ kind: "employee", person: r })
                          }
                        />
                      </td>
                      <td className="print:hidden border-b border-black px-1 py-0">
                        {state.name.trim() ? (
                          <button
                            type="button"
                            onClick={() => addFromBlank(r)}
                            className="text-xs font-medium text-[#003366] underline"
                          >
                            Add to list
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Guest
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        <section className="mt-4 border-2 border-black p-3">
          <h3 className="text-[12pt] font-bold uppercase">
            Trainer certification
          </h3>
          <p className="mt-2 text-[12pt] leading-snug">
            {TRAINER_CERT}
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
        <DialogContent className="sm:max-w-xl" showCloseButton>
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
                key={
                  signing.kind === "employee" ? signing.person.id : "trainer"
                }
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

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Add employee</DialogTitle>
            <DialogDescription>
              They are saved on the default sign-in list for this device.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1">
              <Label htmlFor="new-name">Employee name</Label>
              <Input
                id="new-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="LAST, FIRST"
                className="h-11 text-base"
                autoFocus
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="new-dept">Department</Label>
              <select
                id="new-dept"
                value={newDept}
                onChange={(e) => setNewDept(e.target.value)}
                className="h-11 rounded-lg border border-border bg-background px-3 text-base"
              >
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
                <option value={OTHER}>Other…</option>
              </select>
            </div>
            {newDept === OTHER ? (
              <div className="grid gap-1">
                <Label htmlFor="custom-dept">New department</Label>
                <Input
                  id="custom-dept"
                  value={customDept}
                  onChange={(e) => setCustomDept(e.target.value)}
                  className="h-11 text-base"
                />
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#003366] hover:bg-[#00264d]"
              disabled={!newName.trim() || !chosenDept()}
              onClick={addEmployee}
            >
              Add to default list
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
  onRemove,
}: {
  department: string;
  count: number;
  rows: RosterPerson[];
  rowState: (person: RosterPerson) => SignRow;
  onOpen: (person: RosterPerson) => void;
  onRemove: (id: string, name: string) => void;
}) {
  return (
    <>
      <tr className="bg-neutral-200">
        <td
          colSpan={5}
          className="border-b border-black px-2 py-0.5 text-[11pt] font-bold"
        >
          {department} — {count} employees
        </td>
      </tr>
      {rows.map((r, i) => {
        const state = rowState(r);
        return (
          <tr key={r.id} className={i % 2 ? "bg-neutral-100" : "bg-white"}>
            <td className="border-b border-black px-2 py-0 text-[10pt] leading-tight">
              {r.n}
            </td>
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
            <td className="print:hidden border-b border-black px-1 py-0">
              <button
                type="button"
                onClick={() => onRemove(r.id, r.name)}
                className="text-xs font-medium text-red-800 underline"
              >
                Remove
              </button>
            </td>
          </tr>
        );
      })}
    </>
  );
}
