"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useEffect, useMemo, useState } from "react";
import { DatePicker } from "@/components/date-picker";
import { PageChrome } from "@/components/page-chrome";
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
import { REMOVE_PASSWORD, useCrew } from "@/lib/crew-store";
import { departmentOptions, EMPLOYEES } from "@/lib/employees";
import {
  EMPLOYER,
  TRAINER_CERT,
  buildRoster,
  formatMeetingDate,
  isSigned,
  rowState as meetingRow,
  type RosterPerson,
} from "@/lib/meeting-record";
import {
  signedCount,
  todayISO,
  useMeeting,
  type SignRow,
} from "@/lib/meeting-store";
import { readSheetQuery, sheetHref } from "@/lib/sheet-href";
import { getTopic } from "@/lib/topics";
import { useShopStore } from "@/lib/use-shop-store";
import { cn } from "@/lib/utils";

function deptChip(active: boolean) {
  return cn(
    "rounded-full border px-3 py-1.5 text-sm duration-75",
    active
      ? "border-cyan-400 bg-cyan-50 text-cyan-950"
      : "border-transparent bg-white text-foreground active:bg-cyan-50",
  );
}

type SignTarget =
  | { kind: "employee"; person: RosterPerson }
  | { kind: "trainer" };

const OTHER = "__other";

export default function SignInPage() {
  const router = useRouter();
  const { meeting, update, saveProgress, ready } = useMeeting();
  const {
    employees,
    ready: crewReady,
    add,
    remove,
    move,
    saveAsDefault,
    restoreOriginal,
  } = useCrew();
  const shop = useShopStore();
  const topic = getTopic(meeting.topic, shop.store.topics);
  const groups = useMemo(() => {
    const order = departmentOptions(employees);
    return order
      .map((department) => ({
        department,
        people: employees.filter((e) => e.department === department),
      }))
      .filter((g) => g.people.length > 0)
      .filter((g) => !meeting.department || g.department === meeting.department);
  }, [employees, meeting.department]);
  const [signing, setSigning] = useState<SignTarget | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDept, setNewDept] = useState<string>(departmentOptions()[0]);
  const [customDept, setCustomDept] = useState("");
  const [listNote, setListNote] = useState("");
  const [pendingRemove, setPendingRemove] = useState<
    { kind: "one"; id: string; name: string } | { kind: "restore" } | null
  >(null);
  const [pendingMove, setPendingMove] = useState<{
    id: string;
    name: string;
    dept: string;
  } | null>(null);
  const [moveDept, setMoveDept] = useState("");
  const [moveCustom, setMoveCustom] = useState("");
  const [removePassword, setRemovePassword] = useState("");
  const [removeError, setRemoveError] = useState("");
  const [showLeft, setShowLeft] = useState(false);
  const [draftSig, setDraftSig] = useState("");

  useEffect(() => {
    if (!ready) return;
    const today = todayISO();
    if (meeting.date !== today) update({ date: today });
    if (readSheetQuery().left) {
      setShowLeft(true);
      if (meeting.department) update({ department: "" });
    }
  }, [ready]);

  useEffect(() => {
    if (meeting.department) setNewDept(meeting.department);
  }, [meeting.department]);

  const roster = useMemo(() => buildRoster(employees), [employees]);
  const departments = departmentOptions(employees);
  const visibleEmployees = meeting.department
    ? employees.filter((e) => e.department === meeting.department)
    : employees;

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
    setRemovePassword("");
    setRemoveError("");
    setPendingRemove({ kind: "one", id, name });
  }

  function startMove(person: RosterPerson) {
    setPendingMove({
      id: person.id,
      name: person.name,
      dept: person.dept,
    });
    setMoveDept(person.dept);
    setMoveCustom("");
    setRemovePassword("");
    setRemoveError("");
  }

  function chosenMoveDept() {
    return moveDept === OTHER ? moveCustom.trim() : moveDept.trim();
  }

  function confirmMove() {
    if (!pendingMove) return;
    if (removePassword !== REMOVE_PASSWORD) {
      setRemoveError("Wrong password.");
      return;
    }
    const department = chosenMoveDept();
    if (!department || department === pendingMove.dept) {
      setPendingMove(null);
      setRemovePassword("");
      setRemoveError("");
      return;
    }
    const person = move(pendingMove.id, department);
    if (!person) return;
    const nextRows = meeting.rows.map((r) =>
      r.id === pendingMove.id || r.name === pendingMove.name
        ? { ...r, dept: department }
        : r,
    );
    update({
      rows: nextRows,
      department:
        meeting.department && meeting.department !== department
          ? department
          : meeting.department,
    });
    setPendingMove(null);
    setMoveCustom("");
    setRemovePassword("");
    setRemoveError("");
    setListNote(
      `${person.name} moved to ${department}. Save as default list to keep this.`,
    );
  }

  function saveList() {
    saveAsDefault(employees);
    setListNote(`Default list saved — ${employees.length} employees.`);
  }

  function saveSheetProgress() {
    const saved = saveProgress();
    const n = signedCount(saved);
    setListNote(
      n
        ? `Saved ${topic.shortTitle} — ${n} signed. Same list when you come back.`
        : `Saved the ${topic.shortTitle} sheet. Same list when people sign later.`,
    );
  }

  function restoreList() {
    setRemovePassword("");
    setRemoveError("");
    setPendingRemove({ kind: "restore" });
  }

  function confirmProtectedRemove() {
    if (removePassword !== REMOVE_PASSWORD) {
      setRemoveError("Wrong password.");
      return;
    }
    if (!pendingRemove) return;
    if (pendingRemove.kind === "one") {
      remove(pendingRemove.id);
      update({
        rows: meeting.rows.filter(
          (r) => r.id !== pendingRemove.id && r.name !== pendingRemove.name,
        ),
      });
      setListNote(`${pendingRemove.name} removed from the default list.`);
    } else {
      restoreOriginal();
      setListNote(`Original list restored — ${EMPLOYEES.length} employees.`);
    }
    setPendingRemove(null);
    setRemovePassword("");
    setRemoveError("");
  }

  const signed = meeting.rows.filter((r) => isSigned(r.sig)).length;
  const deptSigned = visibleEmployees.filter((person) => {
    const row = meeting.rows.find(
      (r) => (r.id && r.id === person.id) || r.name === person.name,
    );
    return row && isSigned(row.sig);
  }).length;
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
  function openSign(target: SignTarget) {
    const sig =
      target.kind === "employee"
        ? meetingRow(meeting, target.person).sig
        : meeting.trainerSig;
    setDraftSig(sig);
    setSigning(target);
  }

  function applyDraft() {
    if (!signing) return;
    if (signing.kind === "employee") {
      patchRow(signing.person, {
        sig: draftSig,
        signedAt: isSigned(draftSig) ? meeting.date : "",
      });
    } else update({ trainerSig: draftSig });
    setSigning(null);
  }

  if (!ready || !crewReady) {
    return (
      <main className="mx-auto w-full max-w-7xl px-4 py-4">
        <p className="text-sm text-muted-foreground">Loading sign-in…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-4 print:max-w-none print:px-0 print:py-0">
      <PageChrome title={meeting.department || topic.shortTitle}>
        <Link
          href={sheetHref("/meetings/packet", meeting.topic, meeting.month)}
          className={buttonVariants({ variant: "outline" })}
        >
          Packet
        </Link>
        <Button
          type="button"
          variant={showLeft ? "default" : "outline"}
          onClick={() => {
            const next = !showLeft;
            setShowLeft(next);
            if (next) update({ department: "" });
            router.replace(
              sheetHref(
                "/meetings/sign-in",
                meeting.topic,
                meeting.month,
                next ? { left: "1" } : undefined,
              ),
              { scroll: false },
            );
          }}
        >
          Who&apos;s left
        </Button>
        <Button type="button" onClick={saveSheetProgress}>
          Save progress
        </Button>
        <Button type="button" variant="outline" onClick={() => window.print()}>
          Print
        </Button>
      </PageChrome>

      <article className="osha-sheet rounded-3xl border bg-white p-4 sm:p-6 print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <div className="mb-3 hidden print:block">
          <p className="text-[12pt] font-bold">{EMPLOYER}</p>
          <p className="text-[12pt]">
            Training sign-in
            {meeting.department ? ` — ${meeting.department}` : ""}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-1">
            <Label className="text-[10pt] font-bold">Date of this session</Label>
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

        <div className="print:hidden mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => update({ department: "" })}
            className={deptChip(!meeting.department)}
          >
            All
          </button>
          {departments.map((dept) => (
            <button
              key={dept}
              type="button"
              onClick={() => update({ department: dept })}
              className={deptChip(meeting.department === dept)}
            >
              {dept}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-2">
          <p className="text-[12pt] font-bold">
            {meeting.department
              ? `${deptSigned} of ${visibleEmployees.length} in ${meeting.department} signed · ${signed} on this ${topic.shortTitle} list`
              : `${signed} signed on this ${topic.shortTitle} list · ${employees.length} employees`}
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
          {showLeft
            ? "Glowing names still need this talk. Signed names stay dim. Tap Who’s left again to turn it off."
            : `${topic.shortTitle} keeps one list for this month. Signatures stay. Save progress, then catch the next crew on the same sheet.`}
          {!showLeft && meeting.savedAt
            ? ` Last saved ${formatMeetingDate(meeting.savedAt.slice(0, 10))}.`
            : ""}
        </p>
        {listNote ? (
          <p className="print:hidden mb-2 text-sm text-emerald-800">{listNote}</p>
        ) : null}

        <div className="mt-2 overflow-x-auto">
          <table className="w-full border-collapse border border-black text-left text-[12pt] [contain:content]">
            <thead>
              <tr className="bg-black text-[10pt] text-white">
                <th className="w-10 px-2 py-1 font-bold">No.</th>
                <th className="px-2 py-1 font-bold">Employee name</th>
                <th className="w-40 px-2 py-1 font-bold">Department</th>
                <th className="w-56 px-2 py-1 font-bold">Employee signature</th>
                <th className="print:hidden w-24 px-2 py-1 font-bold">List</th>
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
                  showLeft={showLeft}
                  onOpen={(person) => openSign({ kind: "employee", person })}
                  onMove={startMove}
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
                            patchRow(r, {
                              name: e.target.value,
                              dept: state.dept || meeting.department,
                            })
                          }
                        />
                      </td>
                      <td className="border-b border-black px-2 py-0">
                        <input
                          className="w-full border-0 bg-transparent text-[12pt] leading-tight outline-none"
                          placeholder="Department"
                          value={state.dept || meeting.department}
                          onChange={(e) =>
                            patchRow(r, { dept: e.target.value })
                          }
                        />
                      </td>
                      <td className="border-b border-black px-1 py-0">
                        <SigPreview
                          sig={state.sig}
                          onOpen={() =>
                            openSign({ kind: "employee", person: r })
                          }
                        />
                      </td>
                      <td className="print:hidden border-b border-black px-1 py-0">
                        {state.name.trim() ? (
                          <button
                            type="button"
                            onClick={() => addFromBlank(r)}
                            className="text-xs font-medium text-cyan-800 underline"
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
                onClick={() => openSign({ kind: "trainer" })}
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
          if (!open) applyDraft();
        }}
      >
        <DialogContent
          className="sm:max-w-xl duration-0 data-open:animate-none data-closed:animate-none"
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
                key={
                  signing.kind === "employee" ? signing.person.id : "trainer"
                }
                size="dialog"
                value={draftSig}
                onChange={setDraftSig}
              />
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" onClick={applyDraft}>
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
              disabled={!newName.trim() || !chosenDept()}
              onClick={addEmployee}
            >
              Add to default list
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={pendingMove !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingMove(null);
            setMoveCustom("");
            setRemovePassword("");
            setRemoveError("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Move employee</DialogTitle>
            <DialogDescription>
              {pendingMove
                ? `Enter the password to move ${pendingMove.name}.`
                : "Enter the password to move this employee."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1">
              <Label htmlFor="move-dept">Department</Label>
              <select
                id="move-dept"
                value={moveDept}
                onChange={(e) => setMoveDept(e.target.value)}
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
            {moveDept === OTHER ? (
              <div className="grid gap-1">
                <Label htmlFor="move-custom">New department</Label>
                <Input
                  id="move-custom"
                  value={moveCustom}
                  onChange={(e) => setMoveCustom(e.target.value)}
                  className="h-11 text-base"
                  autoFocus
                />
              </div>
            ) : null}
            <div className="grid gap-1">
              <Label htmlFor="move-password">Password</Label>
              <Input
                id="move-password"
                type="password"
                value={removePassword}
                onChange={(e) => {
                  setRemovePassword(e.target.value);
                  setRemoveError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmMove();
                }}
                className="h-11 text-base"
              />
              {removeError && pendingMove ? (
                <p className="text-sm text-red-700">{removeError}</p>
              ) : null}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPendingMove(null);
                setMoveCustom("");
                setRemovePassword("");
                setRemoveError("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!chosenMoveDept()}
              onClick={confirmMove}
            >
              Move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={pendingRemove !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingRemove(null);
            setRemovePassword("");
            setRemoveError("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>
              {pendingRemove?.kind === "restore"
                ? "Restore original list"
                : "Remove employee"}
            </DialogTitle>
            <DialogDescription>
              {pendingRemove?.kind === "restore"
                ? "Enter the password to restore the original crew list."
                : `Enter the password to remove ${pendingRemove?.name ?? "this employee"}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="remove-password">Password</Label>
            <Input
              id="remove-password"
              type="password"
              value={removePassword}
              onChange={(e) => {
                setRemovePassword(e.target.value);
                setRemoveError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmProtectedRemove();
              }}
              className="h-11 text-base"
              autoFocus
            />
            {removeError ? (
              <p className="text-sm text-red-700">{removeError}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPendingRemove(null);
                setRemovePassword("");
                setRemoveError("");
              }}
            >
              Cancel
            </Button>
            <Button type="button" onClick={confirmProtectedRemove}>
              {pendingRemove?.kind === "restore" ? "Restore" : "Remove"}
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

const GroupRows = memo(function GroupRows({
  department,
  count,
  rows,
  rowState,
  showLeft,
  onOpen,
  onMove,
  onRemove,
}: {
  department: string;
  count: number;
  rows: RosterPerson[];
  rowState: (person: RosterPerson) => SignRow;
  showLeft: boolean;
  onOpen: (person: RosterPerson) => void;
  onMove: (person: RosterPerson) => void;
  onRemove: (id: string, name: string) => void;
}) {
  const left = rows.filter((r) => !isSigned(rowState(r).sig)).length;
  return (
    <>
      <tr className="bg-neutral-200">
        <td
          colSpan={5}
          className="border-b border-black px-2 py-0.5 text-[11pt] font-bold"
        >
          {department} —{" "}
          {showLeft ? `${left} left` : `${count} employees`}
        </td>
      </tr>
      {rows.map((r, i) => {
        const state = rowState(r);
        const unsigned = !isSigned(state.sig);
        return (
          <tr
            key={r.id}
            className={cn(
              i % 2 ? "bg-neutral-100" : "bg-white",
              showLeft &&
                unsigned &&
                "bg-amber-100 shadow-[inset_0_0_0_2px_#f59e0b,0_0_18px_rgba(245,158,11,0.45)]",
              showLeft && !unsigned && "opacity-35",
            )}
          >
            <td className="border-b border-black px-2 py-0 text-[10pt] leading-tight">
              {r.n}
            </td>
            <td className="border-b border-black px-2 py-0 text-[12pt] leading-tight">
              <button
                type="button"
                onClick={() => onOpen(r)}
                className="text-left font-medium text-cyan-900 underline decoration-dotted print:text-black print:no-underline print:font-normal"
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
              <div className="flex flex-col items-start gap-0.5">
                <button
                  type="button"
                  onClick={() => onMove(r)}
                  className="text-xs font-medium text-cyan-800 underline"
                >
                  Move
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(r.id, r.name)}
                  className="text-xs font-medium text-red-800 underline"
                >
                  Remove
                </button>
              </div>
            </td>
          </tr>
        );
      })}
    </>
  );
});
