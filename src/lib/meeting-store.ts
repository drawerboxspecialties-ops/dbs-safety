"use client";

import { useCallback, useEffect, useState } from "react";
import { loadCrew, persistDefaultCrew } from "@/lib/crew-store";
import { cloneEmployees, type Employee } from "@/lib/employees";
import { readSheetQuery } from "@/lib/sheet-href";
import type { TopicId } from "@/lib/topics";

export type SignRow = {
  id?: string;
  n: string;
  name: string;
  dept: string;
  sig: string;
  signedAt?: string;
};

export type MeetingState = {
  date: string;
  topic: TopicId;
  /** Month this topic’s running sheet belongs to. */
  month: string;
  trainer: string;
  trainerSig: string;
  trainerTitle: string;
  /** Department being caught this session. Empty string = all. */
  department: string;
  rows: SignRow[];
  /** Crew frozen on this month’s sheet. Later add/remove does not rewrite this. */
  roster: Employee[];
  savedAt?: string;
};

export type SheetProgress = {
  id: string;
  topic: TopicId;
  month: string;
  signed: number;
  savedAt?: string;
};

const KEY = "dbs-safety-meeting";
const SHEETS_KEY = "dbs-safety-meeting-sheets";
const APPLIED_MONTH = "dbs-safety-applied-month";

export function todayISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

export function monthKeyNow() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function sheetId(month: string, topic: TopicId) {
  return `${month}::${topic}`;
}

export function emptyMeeting(): MeetingState {
  return {
    date: todayISO(),
    topic: "ppe",
    month: monthKeyNow(),
    trainer: "",
    trainerSig: "",
    trainerTitle: "",
    department: "",
    rows: [],
    roster: [],
  };
}

function withRoster(state: MeetingState): MeetingState {
  if (state.roster.length) return state;
  return {
    ...state,
    roster: cloneEmployees(loadCrew()),
  };
}

export function signedCount(state: Pick<MeetingState, "rows">) {
  return (state.rows ?? []).filter((r) => r.sig?.startsWith("data:image"))
    .length;
}

export function normalizeMeeting(
  raw: Partial<MeetingState> | null | undefined,
): MeetingState {
  const base = emptyMeeting();
  if (!raw || typeof raw !== "object") return base;
  return {
    ...base,
    ...raw,
    month: raw.month || monthKeyNow(),
    rows: Array.isArray(raw.rows) ? raw.rows : [],
    roster: Array.isArray(raw.roster) ? cloneEmployees(raw.roster) : [],
  };
}

function loadSheets(): Record<string, MeetingState> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(SHEETS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, MeetingState>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeSheets(sheets: Record<string, MeetingState>) {
  localStorage.setItem(SHEETS_KEY, JSON.stringify(sheets));
}

export function listSheetProgress(): SheetProgress[] {
  return Object.entries(loadSheets()).map(([id, state]) => {
    const sep = id.indexOf("::");
    const month = sep >= 0 ? id.slice(0, sep) : monthKeyNow();
    const topic = sep >= 0 ? id.slice(sep + 2) : id;
    const meeting = normalizeMeeting(state);
    return {
      id,
      topic,
      month,
      signed: signedCount(meeting),
      savedAt: meeting.savedAt,
    };
  });
}

export function progressForMonth(
  month: string,
  topic?: TopicId,
): SheetProgress | null {
  const all = listSheetProgress().filter((row) => row.month === month);
  if (topic) return all.find((row) => row.topic === topic) ?? null;
  return [...all].sort((a, b) => b.signed - a.signed)[0] ?? null;
}

export function sheetProgress(
  topic: TopicId,
  month: string,
): SheetProgress | null {
  const state = loadSheets()[sheetId(month, topic)];
  if (!state) return null;
  const meeting = normalizeMeeting(state);
  return {
    id: sheetId(month, topic),
    topic,
    month,
    signed: signedCount(meeting),
    savedAt: meeting.savedAt,
  };
}

export function loadMeeting(): MeetingState {
  if (typeof window === "undefined") return emptyMeeting();
  try {
    const raw = localStorage.getItem(KEY);
    const current = raw
      ? normalizeMeeting(JSON.parse(raw) as Partial<MeetingState>)
      : emptyMeeting();
    const id = sheetId(current.month, current.topic);
    const sheets = loadSheets();
    if (sheets[id]) {
      return withRoster(
        normalizeMeeting({
          ...sheets[id],
          topic: current.topic,
          month: current.month,
        }),
      );
    }
    const fresh = withRoster(
      normalizeMeeting({
        topic: current.topic,
        month: current.month,
        department: current.department,
        date: todayISO(),
      }),
    );
    persistSheet(fresh);
    return fresh;
  } catch {
    return emptyMeeting();
  }
}

export function saveMeeting(state: MeetingState) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

function persistSheet(state: MeetingState) {
  const next = withRoster(normalizeMeeting(state));
  saveMeeting(next);
  const sheets = loadSheets();
  sheets[sheetId(next.month, next.topic)] = next;
  writeSheets(sheets);
}

let persistTimer = 0;

function persistSheetSoon(state: MeetingState) {
  if (typeof window === "undefined") {
    persistSheet(state);
    return;
  }
  window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => persistSheet(state), 160);
}

function persistSheetNow(state: MeetingState) {
  if (typeof window !== "undefined") window.clearTimeout(persistTimer);
  persistSheet(state);
}

function openSheet(
  prev: MeetingState,
  topic: TopicId,
  destMonth: string,
  sourceMonth: string,
): MeetingState {
  const sheets = loadSheets();
  sheets[sheetId(sourceMonth, prev.topic)] = withRoster(
    normalizeMeeting({
      ...prev,
      month: sourceMonth,
    }),
  );
  const stored = sheets[sheetId(destMonth, topic)];
  const next: MeetingState = stored
    ? withRoster(
        normalizeMeeting({
          ...stored,
          topic,
          month: destMonth,
          department: prev.department,
          date: todayISO(),
        }),
      )
    : withRoster(
        normalizeMeeting({
          topic,
          month: destMonth,
          department: prev.department,
          date: todayISO(),
        }),
      );
  sheets[sheetId(destMonth, topic)] = next;
  writeSheets(sheets);
  saveMeeting(next);
  return next;
}

export function useMeeting(lock?: { topic?: TopicId; month?: string }) {
  const [meeting, setMeeting] = useState<MeetingState>(emptyMeeting);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let local = loadMeeting();
    const query = readSheetQuery();
    const topic = lock?.topic || query.topic;
    const month = lock?.month || query.month;
    if (topic || month) {
      local = openSheet(
        local,
        (topic || local.topic) as TopicId,
        month || local.month,
        local.month,
      );
    }
    setMeeting(local);
    setReady(true);
    if (lock?.topic || lock?.month) return;
    fetch("/api/store")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.currentMonth || !data?.currentTopic) return;
        const chosen = readSheetQuery();
        if (chosen.topic || chosen.month) return;
        const applied = window.localStorage.getItem(APPLIED_MONTH);
        if (applied === data.currentMonth) return;
        const next = openSheet(
          local,
          data.currentTopic as TopicId,
          data.currentMonth,
          applied || local.month || monthKeyNow(),
        );
        setMeeting(next);
        window.localStorage.setItem(APPLIED_MONTH, data.currentMonth);
      })
      .catch(() => undefined);
  }, [lock?.topic, lock?.month]);

  const update = useCallback((patch: Partial<MeetingState>) => {
    setMeeting((prev) => {
      const destTopic = patch.topic ?? prev.topic;
      const destMonth = patch.month ?? prev.month ?? monthKeyNow();
      const sourceMonth = prev.month || monthKeyNow();
      if (destTopic !== prev.topic || destMonth !== sourceMonth) {
        const switched = openSheet(prev, destTopic, destMonth, sourceMonth);
        const next = normalizeMeeting({
          ...switched,
          ...patch,
          topic: destTopic,
          month: destMonth,
        });
        persistSheetNow(next);
        return next;
      }
      const next = normalizeMeeting({ ...prev, ...patch, month: destMonth });
      persistSheetSoon(next);
      return next;
    });
  }, []);

  const saveProgress = useCallback(() => {
    let saved = emptyMeeting();
    setMeeting((prev) => {
      saved = withRoster(
        normalizeMeeting({
          ...prev,
          savedAt: new Date().toISOString(),
          month: prev.month || monthKeyNow(),
        }),
      );
      persistSheetNow(saved);
      persistDefaultCrew(saved.roster);
      return saved;
    });
    return saved;
  }, []);

  return { meeting, update, saveProgress, ready };
}
