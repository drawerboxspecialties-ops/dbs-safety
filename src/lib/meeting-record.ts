import { format, parseISO } from "date-fns";
import {
  BLANK_ROWS,
  employeesByDepartment,
} from "@/lib/employees";
import type { MeetingState, SignRow } from "@/lib/meeting-store";
import { getTopic, type TopicId } from "@/lib/topics";

export const EMPLOYER = "Drawer Box Specialties";
export const WORKPLACE = "Shop — drawer boxes, cabinets, and doors";

export const TRAINER_CERT =
  "I certify that each employee who signed has received and understood the training on the subject listed.";

export type RosterPerson = {
  n: number;
  name: string;
  dept: string;
  extra: boolean;
};

export type AttendanceRow = {
  n: number;
  name: string;
  dept: string;
  sig: string;
};

export type FiledMeeting = {
  id: string;
  filedAt: string;
  date: string;
  topic: TopicId;
  subject: string;
  trainer: string;
  trainerTitle: string;
  trained: { name: string; dept: string }[];
  makeup: { name: string; dept: string }[];
  topicsCovered: string[];
};

const RECORDS_KEY = "dbs-safety-meeting-records";

export function isSigned(sig: string) {
  return sig.startsWith("data:image");
}

export function formatMeetingDate(iso: string) {
  if (!iso) return "";
  try {
    const day = iso.includes("T") ? iso.slice(0, 10) : iso;
    return format(parseISO(day), "MMMM d, yyyy");
  } catch {
    return iso;
  }
}

export function buildRoster(): RosterPerson[] {
  const rows: RosterPerson[] = [];
  let n = 0;
  for (const group of employeesByDepartment()) {
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
}

export function rowState(meeting: MeetingState, n: number): SignRow {
  return (
    meeting.rows.find((r) => r.n === String(n)) ?? {
      n: String(n),
      name: "",
      dept: "",
      sig: "",
    }
  );
}

export function attendanceName(person: RosterPerson, row: SignRow) {
  return (person.name || row.name).trim();
}

export function attendanceDept(person: RosterPerson, row: SignRow) {
  return (person.dept || row.dept).trim();
}

export function trainedEmployees(
  meeting: MeetingState,
  roster = buildRoster(),
): AttendanceRow[] {
  return roster
    .map((person) => {
      const row = rowState(meeting, person.n);
      return {
        n: person.n,
        name: attendanceName(person, row),
        dept: attendanceDept(person, row),
        sig: row.sig,
      };
    })
    .filter((r) => r.name && isSigned(r.sig));
}

export function makeupEmployees(
  meeting: MeetingState,
  roster = buildRoster(),
): { name: string; dept: string }[] {
  return roster
    .map((person) => {
      const row = rowState(meeting, person.n);
      return {
        name: attendanceName(person, row),
        dept: attendanceDept(person, row),
        signed: isSigned(row.sig),
        extra: person.extra,
      };
    })
    .filter((r) => r.name && !r.signed)
    .map(({ name, dept }) => ({ name, dept }));
}

export function recordGaps(meeting: MeetingState): string[] {
  const gaps: string[] = [];
  if (!meeting.date) gaps.push("Date of training");
  if (!meeting.topic) gaps.push("Subject");
  if (!meeting.trainer.trim()) gaps.push("Trainer name");
  if (!isSigned(meeting.trainerSig)) gaps.push("Trainer signature");
  if (trainedEmployees(meeting).length === 0) {
    gaps.push("At least one employee signature");
  }
  return gaps;
}

export function snapshotMeeting(meeting: MeetingState): FiledMeeting {
  const topic = getTopic(meeting.topic);
  return {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${meeting.date}-${meeting.topic}-${Date.now()}`,
    filedAt: new Date().toISOString(),
    date: meeting.date,
    topic: meeting.topic,
    subject: topic.title,
    trainer: meeting.trainer.trim(),
    trainerTitle: meeting.trainerTitle.trim(),
    trained: trainedEmployees(meeting).map(({ name, dept }) => ({
      name,
      dept,
    })),
    makeup: makeupEmployees(meeting),
    topicsCovered: topic.talkingPoints,
  };
}

export function loadFiledMeetings(): FiledMeeting[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECORDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FiledMeeting[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveFiledMeeting(record: FiledMeeting) {
  const next = [record, ...loadFiledMeetings()].slice(0, 40);
  localStorage.setItem(RECORDS_KEY, JSON.stringify(next));
  return next;
}
