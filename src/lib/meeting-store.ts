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
  trainer: string;
  trainerSig: string;
  trainerTitle: string;
  /** Department being caught this session. Empty string = all. */
  department: string;
  rows: SignRow[];
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
    trainer: "",
    trainerSig: "",
    trainerTitle: "",
    department: "",
    rows: [],
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

export function loadMeeting(): MeetingState {
  if (typeof window === "undefined") return emptyMeeting();
  try {
    const raw = localStorage.getItem(KEY);
    const current = raw
      ? { ...emptyMeeting(), ...JSON.parse(raw) }
      : emptyMeeting();
    const id = sheetId(monthKeyNow(), current.topic);
    const sheets = loadSheets();
    if (sheets[id]) {
      return { ...emptyMeeting(), ...sheets[id], topic: current.topic };
    }
    persistSheet(current, monthKeyNow());
    return current;
  } catch {
    return emptyMeeting();
  }
}

export function saveMeeting(state: MeetingState) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

function persistSheet(state: MeetingState, month = monthKeyNow()) {
  saveMeeting(state);
  const sheets = loadSheets();
  sheets[sheetId(month, state.topic)] = state;
  writeSheets(sheets);
}

function openSheet(
  prev: MeetingState,
  topic: TopicId,
  destMonth: string,
  sourceMonth: string,
): MeetingState {
  const sheets = loadSheets();
  sheets[sheetId(sourceMonth, prev.topic)] = prev;
  const stored = sheets[sheetId(destMonth, topic)];
  const next: MeetingState = stored
    ? {
        ...emptyMeeting(),
        ...stored,
        topic,
        department: prev.department,
        date: todayISO(),
      }
    : {
        ...emptyMeeting(),
        topic,
        trainer: prev.trainer,
        trainerTitle: prev.trainerTitle,
        department: prev.department,
        date: todayISO(),
      };
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
          applied || monthKeyNow(),
        );
        setMeeting(next);
        window.localStorage.setItem(APPLIED_MONTH, data.currentMonth);
      })
      .catch(() => undefined);
  }, []);

  const update = useCallback((patch: Partial<MeetingState>) => {
    setMeeting((prev) => {
      if (patch.topic && patch.topic !== prev.topic) {
        const switched = openSheet(
          prev,
          patch.topic,
          monthKeyNow(),
          monthKeyNow(),
        );
        const next = { ...switched, ...patch, topic: switched.topic };
        persistSheet(next);
        return next;
      }
      const next = { ...prev, ...patch };
      persistSheet(next);
      return next;
    });
  }, []);

  return { meeting, update, ready };
}
