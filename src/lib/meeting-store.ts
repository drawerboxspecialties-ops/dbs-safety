"use client";

import { useCallback, useEffect, useState } from "react";
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
      return normalizeMeeting({
        ...sheets[id],
        topic: current.topic,
        month: current.month,
      });
    }
    persistSheet(current);
    return current;
  } catch {
    return emptyMeeting();
  }
}

export function saveMeeting(state: MeetingState) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

function persistSheet(state: MeetingState) {
  const next = normalizeMeeting(state);
  saveMeeting(next);
  const sheets = loadSheets();
  sheets[sheetId(next.month, next.topic)] = next;
  writeSheets(sheets);
}

function openSheet(
  prev: MeetingState,
  topic: TopicId,
  destMonth: string,
  sourceMonth: string,
): MeetingState {
  const sheets = loadSheets();
  sheets[sheetId(sourceMonth, prev.topic)] = normalizeMeeting({
    ...prev,
    month: sourceMonth,
  });
  const stored = sheets[sheetId(destMonth, topic)];
  const next: MeetingState = stored
    ? normalizeMeeting({
        ...stored,
        topic,
        month: destMonth,
        department: prev.department,
        date: todayISO(),
      })
    : normalizeMeeting({
        topic,
        month: destMonth,
        trainer: prev.trainer,
        trainerTitle: prev.trainerTitle,
        department: prev.department,
        date: todayISO(),
      });
  sheets[sheetId(destMonth, topic)] = next;
  writeSheets(sheets);
  saveMeeting(next);
  return next;
}

export function useMeeting() {
  const [meeting, setMeeting] = useState<MeetingState>(emptyMeeting);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const local = loadMeeting();
    setMeeting(local);
    setReady(true);
    fetch("/api/store")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.currentMonth || !data?.currentTopic) return;
        const applied = window.localStorage.getItem(APPLIED_MONTH);
        if (applied === data.currentMonth) {
          if (local.topic !== data.currentTopic) {
            setMeeting(
              openSheet(
                local,
                data.currentTopic as TopicId,
                data.currentMonth,
                data.currentMonth,
              ),
            );
          }
          return;
        }
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
  }, []);

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
        persistSheet(next);
        return next;
      }
      const next = normalizeMeeting({ ...prev, ...patch, month: destMonth });
      persistSheet(next);
      return next;
    });
  }, []);

  const saveProgress = useCallback(() => {
    let saved = emptyMeeting();
    setMeeting((prev) => {
      saved = normalizeMeeting({
        ...prev,
        savedAt: new Date().toISOString(),
        month: prev.month || monthKeyNow(),
      });
      persistSheet(saved);
      return saved;
    });
    return saved;
  }, []);

  return { meeting, update, saveProgress, ready };
}
