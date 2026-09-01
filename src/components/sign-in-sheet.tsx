"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useEffect, useMemo, useState } from "react";
import { Cloud, Mail } from "lucide-react";
import { DatePicker } from "@/components/date-picker";
import { PageChrome } from "@/components/page-chrome";
import { PageFrame } from "@/components/page-frame";
import { SignatureImage, SignaturePad } from "@/components/signature-pad";
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
import {
  cloneEmployees,
  departmentOptions,
  EMPLOYEES,
} from "@/lib/employees";
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
import {
  DRIVE_MEETINGS_URL,
  connectGoogleDrive,
  disconnectGoogleDrive,
  hasGoogleClientId,
  preloadGoogleSignIn,
  readDriveStatus,
  setGoogleClientId,
  subscribeDriveStatus,
  uploadMeetingPdfs,
} from "@/lib/drive-archive";
import {
  blobFromUrl,
  downloadBlob,
  loadLastEmailTo,
  saveLastEmailTo,
  shareSignInPdf,
} from "@/lib/email-sheet";
import { readSheetQuery, sheetHref } from "@/lib/sheet-href";
import {
  archivePdfNames,
  buildSignInPdf,
  sheetEmailSubject,
  sheetPdfFilename,
} from "@/lib/sheet-pdf";
import { normalizeSignature } from "@/lib/signature-image";
import { packetUrl } from "@/lib/packet";
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

export function SignInSheet({
  embedded,
  topicId,
  month,
  onBack,
}: {
  embedded?: boolean;
  topicId?: string;
  month?: string;
  onBack?: () => void;
}) {
  const router = useRouter();
  const { meeting, update, saveProgress, ready } = useMeeting(
    topicId || month ? { topic: topicId, month } : undefined,
  );
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
  const sheetCrew =
    meeting.roster.length > 0 ? meeting.roster : employees;
  const groups = useMemo(() => {
    const order = departmentOptions(sheetCrew);
    return order
      .map((department) => ({
        department,
        people: sheetCrew.filter((e) => e.department === department),
      }))
      .filter((g) => g.people.length > 0)
      .filter((g) => !meeting.department || g.department === meeting.department);
  }, [sheetCrew, meeting.department]);
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
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [saveBusy, setSaveBusy] = useState(false);
  const [driveOpen, setDriveOpen] = useState(false);
  const [driveBusy, setDriveBusy] = useState(false);
  const [driveError, setDriveError] = useState("");
  const [driveClientId, setDriveClientId] = useState(
    () => readDriveStatus().clientId,
  );
  const [drive, setDrive] = useState(readDriveStatus);

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

  useEffect(() => subscribeDriveStatus(() => setDrive(readDriveStatus())), []);

  useEffect(() => {
    void preloadGoogleSignIn();
  }, []);

  const roster = useMemo(() => buildRoster(sheetCrew), [sheetCrew]);
  const departments = departmentOptions(sheetCrew);
  const visibleEmployees = meeting.department
    ? sheetCrew.filter((e) => e.department === meeting.department)
    : sheetCrew;

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
    update({ roster: [...sheetCrew, person] });
    setNewName("");
    setCustomDept("");
    setAdding(false);
    setListNote(
      `${person.name} added to this month and the default list for later months.`,
    );
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
    update({ rows: next, roster: [...sheetCrew, added] });
    setListNote(
      `${added.name} added to this month and the default list for later months.`,
    );
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
      roster: sheetCrew.map((e) =>
        e.id === pendingMove.id ? { ...e, department } : e,
      ),
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
      `${person.name} moved to ${department} on this month and the default list for later months.`,
    );
  }

  function saveList() {
    saveAsDefault(sheetCrew);
    setListNote(
      `Default list for later months saved — ${sheetCrew.length} employees. Past months stay as they were.`,
    );
  }

  function openEmailSheet() {
    const monthKey = meeting.month || shop.monthKey;
    setEmailError("");
    setEmailTo(loadLastEmailTo());
    setEmailSubject(
      sheetEmailSubject(topic, shop.formatMonthLabel(monthKey)),
    );
    setEmailOpen(true);
  }

  async function sendEmailSheet() {
    const monthKey = meeting.month || shop.monthKey;
    const monthLabel = shop.formatMonthLabel(monthKey);
    setEmailBusy(true);
    setEmailError("");
    try {
      const pdf = await buildSignInPdf({
        meeting,
        topic,
        employees: sheetCrew,
        monthLabel,
      });
      const filename = sheetPdfFilename(topic, monthKey);
      const body = [
        `Attached is the DBS Safety sign-in sheet for ${topic.title}.`,
        `Month: ${monthLabel}`,
        meeting.department ? `Department: ${meeting.department}` : "",
        meeting.date ? `Session date: ${formatMeetingDate(meeting.date)}` : "",
        meeting.trainer ? `Trainer: ${meeting.trainer}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      saveLastEmailTo(emailTo);
      const result = await shareSignInPdf({
        to: emailTo.trim(),
        subject: emailSubject.trim() || sheetEmailSubject(topic, monthLabel),
        body,
        filename,
        pdf,
      });
      if (result === "cancelled") return;
      setEmailOpen(false);
      setListNote(
        result === "shared"
          ? "Share sheet opened with the PDF attached. Pick Mail or your email app."
          : "Email draft downloaded with the PDF attached. Open it in Mail or Outlook to send.",
      );
    } catch (err) {
      setEmailError(
        err instanceof Error ? err.message : "Could not build the PDF.",
      );
    } finally {
      setEmailBusy(false);
    }
  }

  function keepLocalCopies(sheet: Blob, talk: Blob | null, names: {
    signIn: string;
    talk: string;
  }) {
    downloadBlob(sheet, names.signIn);
    if (talk) downloadBlob(talk, names.talk);
  }

  async function saveSheetProgress() {
    const saved = saveProgress();
    const n = signedCount(saved);
    const monthKey = saved.month || shop.monthKey;
    const monthLabel = shop.formatMonthLabel(monthKey);
    const crew = saved.roster.length ? saved.roster : sheetCrew;
    const names = archivePdfNames(topic, monthKey);
    setSaveBusy(true);
    try {
      const rows = await Promise.all(
        saved.rows.map(async (row) => ({
          ...row,
          sig: row.sig ? await normalizeSignature(row.sig) : row.sig,
        })),
      );
      const trainerSig = saved.trainerSig
        ? await normalizeSignature(saved.trainerSig)
        : saved.trainerSig;
      const cleaned = { ...saved, rows, trainerSig };
      update({ rows, trainerSig });
      const sheet = await buildSignInPdf({
        meeting: cleaned,
        topic,
        employees: crew,
        monthLabel,
      });
      let talk: Blob | null = null;
      const talkUrl = packetUrl(topic.pdf);
      if (talkUrl) {
        try {
          talk = await blobFromUrl(talkUrl);
        } catch {
          talk = null;
        }
      }
      const files = [{ name: names.signIn, blob: sheet }];
      if (talk) files.push({ name: names.talk, blob: talk });

      if (!hasGoogleClientId()) {
        keepLocalCopies(sheet, talk, names);
        setDriveClientId("");
        setDriveError("");
        setDriveOpen(true);
        setListNote(
          n
            ? `Saved ${topic.shortTitle} for ${monthLabel} — ${n} signed. PDFs downloaded. Connect Google Drive so the next save goes to DBS Safety / Safety Meetings.`
            : `Saved the ${topic.shortTitle} sheet for ${monthLabel}. PDFs downloaded. Connect Google Drive so the next save goes to DBS Safety / Safety Meetings.`,
        );
        return;
      }

      try {
        const uploaded = await uploadMeetingPdfs(files);
        setDrive(readDriveStatus());
        setListNote(
          n
            ? `Saved ${topic.shortTitle} for ${monthLabel} — ${n} signed. Uploaded to Google Drive → ${uploaded.folder}${uploaded.email ? ` (${uploaded.email})` : ""}.`
            : `Saved the ${topic.shortTitle} sheet for ${monthLabel}. Uploaded to Google Drive → ${uploaded.folder}${uploaded.email ? ` (${uploaded.email})` : ""}.`,
        );
      } catch (err) {
        keepLocalCopies(sheet, talk, names);
        const msg =
          err instanceof Error ? err.message : "Google Drive upload failed.";
        setListNote(
          n
            ? `Saved ${topic.shortTitle} for ${monthLabel} — ${n} signed. Drive upload failed (${msg}). PDFs downloaded instead.`
            : `Saved the ${topic.shortTitle} sheet for ${monthLabel}. Drive upload failed (${msg}). PDFs downloaded instead.`,
        );
      }
    } catch {
      setListNote(
        n
          ? `Saved ${topic.shortTitle} for ${monthLabel} — ${n} signed. Could not build the PDFs.`
          : `Saved the ${topic.shortTitle} sheet for ${monthLabel}. Could not build the PDFs.`,
      );
    } finally {
      setSaveBusy(false);
    }
  }

  async function confirmDriveConnect() {
    setDriveBusy(true);
    setDriveError("");
    try {
      if (driveClientId.trim()) setGoogleClientId(driveClientId.trim());
      if (!hasGoogleClientId()) {
        setDriveError("Paste the Google client ID first.");
        return;
      }
      const email = await connectGoogleDrive();
      setDrive(readDriveStatus());
      setDriveClientId(readDriveStatus().clientId);
      setDriveOpen(false);
      setListNote(
        email
          ? `Google Drive connected as ${email}. Save progress will upload to DBS Safety / Safety Meetings.`
          : "Google Drive connected. Save progress will upload to DBS Safety / Safety Meetings.",
      );
    } catch (err) {
      setDriveError(
        err instanceof Error ? err.message : "Could not connect Google Drive.",
      );
    } finally {
      setDriveBusy(false);
    }
  }

  async function confirmDriveDisconnect() {
    setDriveBusy(true);
    setDriveError("");
    try {
      await disconnectGoogleDrive();
      setDrive(readDriveStatus());
    } catch (err) {
      setDriveError(
        err instanceof Error ? err.message : "Could not disconnect.",
      );
    } finally {
      setDriveBusy(false);
    }
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
        roster: sheetCrew.filter(
          (e) => e.id !== pendingRemove.id && e.name !== pendingRemove.name,
        ),
      });
      setListNote(
        `${pendingRemove.name} removed from this month and the default list for later months. Past months stay as they were.`,
      );
    } else {
      restoreOriginal();
      update({ roster: cloneEmployees(EMPLOYEES) });
      setListNote(
        `Original list restored on this month and as the default for later months. Past months stay as they were.`,
      );
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

  const body = (
    <>
      <PageChrome title={meeting.department || topic.shortTitle}>
        {embedded ? (
          <Button type="button" variant="outline" onClick={onBack}>
            Packet
          </Button>
        ) : (
          <Link
            href={sheetHref("/meetings/packet", meeting.topic, meeting.month)}
            className={buttonVariants({ variant: "outline" })}
          >
            Packet
          </Link>
        )}
        <Button
          type="button"
          variant={showLeft ? "default" : "outline"}
          onClick={() => {
            const next = !showLeft;
            setShowLeft(next);
            if (next) update({ department: "" });
            if (!embedded) {
              router.replace(
                sheetHref(
                  "/meetings/sign-in",
                  meeting.topic,
                  meeting.month,
                  next ? { left: "1" } : undefined,
                ),
                { scroll: false },
              );
            }
          }}
        >
          Who&apos;s left
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setDriveError("");
            setDriveClientId(readDriveStatus().clientId);
            setDriveOpen(true);
          }}
        >
          <Cloud />
          {drive.connected
            ? drive.email
              ? `Drive · ${drive.email}`
              : "Drive connected"
            : "Google Drive"}
        </Button>
        <Button
          type="button"
          disabled={saveBusy}
          onClick={() => void saveSheetProgress()}
        >
          {saveBusy ? "Saving…" : "Save progress"}
        </Button>
        <Button type="button" variant="outline" onClick={() => window.print()}>
          Print
        </Button>
        <Button type="button" variant="outline" onClick={openEmailSheet}>
          <Mail />
          Email PDF
        </Button>
      </PageChrome>

      <article className="osha-sheet rounded-2xl border bg-white p-4 print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <div className="mb-3 hidden print:block">
          <p className="text-[12pt] font-bold">{EMPLOYER}</p>
          <p className="text-[12pt]">
            Training sign-in
            {meeting.department ? ` — ${meeting.department}` : ""}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
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
              className="h-9 text-sm"
            />
          </div>
          <div className="grid gap-1">
            <Label className="text-[10pt] font-bold">
              Trainer / certifying person
            </Label>
            <Input
              value={meeting.trainer}
              onChange={(e) => update({ trainer: e.target.value })}
              className="h-9 text-sm"
            />
          </div>
        </div>

        <div className="print:hidden mt-3 flex flex-wrap gap-2">
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

        <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
          <p className="print:hidden text-[12pt] font-bold">
            {meeting.department
              ? `${deptSigned} of ${visibleEmployees.length} in ${meeting.department} signed · ${signed} on this ${topic.shortTitle} list`
              : `${signed} signed on this ${topic.shortTitle} list · ${sheetCrew.length} employees`}
          </p>
          <div className="print:hidden flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setAdding(true)}>
              Add employee
            </Button>
            <Button type="button" variant="outline" onClick={saveList}>
              Use list next month
            </Button>
            <Button type="button" variant="ghost" onClick={restoreList}>
              Restore original
            </Button>
          </div>
        </div>
        {listNote || meeting.savedAt ? (
          <p className="print:hidden mb-1 text-xs text-muted-foreground">
            {listNote
              ? listNote
              : meeting.savedAt
                ? `Last saved ${formatMeetingDate(meeting.savedAt.slice(0, 10))}.`
                : ""}
          </p>
        ) : null}

        <div className="mt-2 overflow-x-auto print:overflow-visible">
          <table className="w-full border-collapse border border-black text-left text-[12pt] [contain:content] print:[contain:none]">
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
                  <SignatureImage
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
                <SignatureImage
                  src={meeting.trainerSig}
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
          className="sm:max-w-2xl duration-0 data-open:animate-none data-closed:animate-none"
          showCloseButton
        >
          <DialogHeader>
            <DialogTitle>Sign here</DialogTitle>
            <DialogDescription>
              {dialogName}
              {dialogDept ? ` · ${dialogDept}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-black bg-white p-3">
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

      <Dialog
        open={emailOpen}
        onOpenChange={(open) => {
          if (!emailBusy) setEmailOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Email this sign-in sheet</DialogTitle>
            <DialogDescription>
              Builds a PDF of the current sheet and opens it as an email
              attachment.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1">
              <Label htmlFor="email-to">To</Label>
              <Input
                id="email-to"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="name@company.com"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="email-subject">Subject</Label>
              <Input
                id="email-subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="h-9"
              />
            </div>
            {emailError ? (
              <p className="text-sm text-red-700">{emailError}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={emailBusy}
              onClick={() => setEmailOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={emailBusy}
              onClick={() => void sendEmailSheet()}
            >
              {emailBusy ? "Building PDF…" : "Email PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={driveOpen}
        onOpenChange={(open) => {
          if (!driveBusy) setDriveOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle>Save to Google Drive</DialogTitle>
            <DialogDescription>
              Save progress uploads this month’s sign-in PDF and talk PDF to{" "}
              <span className="font-medium text-foreground">
                DBS Safety / Safety Meetings
              </span>
              . Files are named like{" "}
              <span className="font-medium text-foreground">
                September 2026 PPE sign-in.pdf
              </span>
              . Saving again overwrites that month’s files.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <a
              href={DRIVE_MEETINGS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-cyan-800 underline"
            >
              Open DBS Safety / Safety Meetings
            </a>
            {drive.connected ? (
              <p className="text-sm">
                Connected
                {drive.email ? ` as ${drive.email}` : ""}. Saves go to the shop
                Drive folder.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                One-time setup: create a Google Cloud OAuth client (Web app),
                turn on the Drive API, and add these JavaScript origins:{" "}
                <span className="text-foreground">
                  http://127.0.0.1:43151
                </span>{" "}
                and{" "}
                <span className="text-foreground">
                  https://drawerboxspecialties-ops.github.io
                </span>
                . Then paste the client ID and connect with the shop Gmail.
              </p>
            )}
            <div className="grid gap-1">
              <Label htmlFor="drive-client-id">Google client ID</Label>
              <Input
                id="drive-client-id"
                value={driveClientId}
                onChange={(e) => setDriveClientId(e.target.value)}
                placeholder="123456789-abc.apps.googleusercontent.com"
                className="h-9 font-mono text-xs"
                autoComplete="off"
              />
            </div>
            {driveError ? (
              <p className="text-sm text-red-700">{driveError}</p>
            ) : null}
          </div>
          <DialogFooter>
            {drive.connected ? (
              <Button
                type="button"
                variant="outline"
                disabled={driveBusy}
                onClick={() => void confirmDriveDisconnect()}
              >
                Disconnect
              </Button>
            ) : null}
            <Button
              type="button"
              disabled={driveBusy}
              onClick={() => void confirmDriveConnect()}
            >
              {driveBusy
                ? "Connecting…"
                : drive.connected
                  ? "Reconnect"
                  : "Connect Drive"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  if (!ready || !crewReady) {
    if (embedded) {
      return <p className="text-muted-foreground">Loading sign-in…</p>;
    }
    return (
      <PageFrame>
        <p className="text-muted-foreground">Loading sign-in…</p>
      </PageFrame>
    );
  }

  if (embedded) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-y-auto pr-0.5 print:h-auto print:overflow-visible">
        {body}
      </div>
    );
  }

  return <PageFrame>{body}</PageFrame>;
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
          <SignatureImage
            src={sig}
            alt="Signature"
            className="h-8 w-full object-contain object-left"
          />
        ) : (
          <span className="text-xs text-muted-foreground">Tap name to sign</span>
        )}
      </button>
      {isSigned(sig) ? (
        <SignatureImage
          src={sig}
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
          {department}
          <span className="print:hidden">
            {" "}
            — {showLeft ? `${left} left` : `${count} employees`}
          </span>
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
                "bg-amber-100 shadow-[inset_0_0_0_2px_#f59e0b,0_0_18px_rgba(245,158,11,0.45)] print:bg-white print:shadow-none",
              showLeft && !unsigned && "opacity-35 print:opacity-100",
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
