"use client";

import { useCallback, useEffect, useState } from "react";
import type { TopicId } from "@/lib/topics";

export type SignRow = {
  id?: string;
  n: string;
  name: string;
  dept: string;
  sig: string;
};

export type MeetingState = {
  date: string;
  topic: TopicId;
  trainer: string;
  trainerSig: string;
  trainerTitle: string;
  rows: SignRow[];
};

const KEY = "dbs-safety-meeting";

function todayISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

export function emptyMeeting(): MeetingState {
  return {
    date: todayISO(),
    topic: "ppe",
    trainer: "",
    trainerSig: "",
    trainerTitle: "",
    rows: [],
  };
}

export function loadMeeting(): MeetingState {
  if (typeof window === "undefined") return emptyMeeting();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyMeeting();
    return { ...emptyMeeting(), ...JSON.parse(raw) };
  } catch {
    return emptyMeeting();
  }
}

export function saveMeeting(state: MeetingState) {
  localStorage.setItem(KEY, JSON.stringify(state));
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
        const applied = window.localStorage.getItem("dbs-safety-applied-month");
        if (applied === data.currentMonth) return;
        const next = { ...local, topic: data.currentTopic as TopicId };
        saveMeeting(next);
        setMeeting(next);
        window.localStorage.setItem(
          "dbs-safety-applied-month",
          data.currentMonth,
        );
      })
      .catch(() => undefined);
  }, []);

  const update = useCallback((patch: Partial<MeetingState>) => {
    setMeeting((prev) => {
      const next = { ...prev, ...patch };
      saveMeeting(next);
      return next;
    });
  }, []);

  return { meeting, update, ready };
}
