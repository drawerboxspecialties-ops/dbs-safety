"use client";

import { useCallback, useEffect, useState } from "react";
import {
  EMPLOYEES,
  makeEmployeeId,
  type Employee,
} from "@/lib/employees";

const KEY = "dbs-safety-crew";

export const REMOVE_PASSWORD = "Dbs92867";

function cloneSeed() {
  return EMPLOYEES.map((e) => ({ ...e }));
}

function normalize(raw: unknown): Employee[] | null {
  if (!Array.isArray(raw)) return null;
  const next: Employee[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const name = String((item as Employee).name ?? "").trim();
    const department = String((item as Employee).department ?? "").trim();
    if (!name) continue;
    const id =
      String((item as Employee).id ?? "").trim() ||
      makeEmployeeId(name, department, next);
    next.push({ id, name, department });
  }
  return next.length ? next : null;
}

export function loadCrew(): Employee[] {
  if (typeof window === "undefined") return cloneSeed();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return cloneSeed();
    return normalize(JSON.parse(raw)) ?? cloneSeed();
  } catch {
    return cloneSeed();
  }
}

export function saveCrew(employees: Employee[]) {
  localStorage.setItem(KEY, JSON.stringify(employees));
}

export function persistDefaultCrew(employees: Employee[]) {
  saveCrew(employees);
  if (typeof window === "undefined") return;
  fetch("/api/store", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ crew: employees }),
  }).catch(() => undefined);
}

/** Merge remote into local by id; local edits win on conflict. */
function mergeCrew(local: Employee[], remote: Employee[]): Employee[] {
  const byId = new Map<string, Employee>();
  for (const person of remote) byId.set(person.id, { ...person });
  for (const person of local) byId.set(person.id, { ...person });
  const source = local.length >= remote.length ? local : remote;
  const seen = new Set<string>();
  const ordered: Employee[] = [];
  for (const person of source) {
    const next = byId.get(person.id);
    if (!next || seen.has(next.id)) continue;
    seen.add(next.id);
    ordered.push(next);
  }
  for (const person of byId.values()) {
    if (seen.has(person.id)) continue;
    seen.add(person.id);
    ordered.push(person);
  }
  return ordered;
}

export function useCrew() {
  const [employees, setEmployees] = useState<Employee[]>(cloneSeed);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const local = loadCrew();
    setEmployees(local);
    const hadLocal = Boolean(window.localStorage.getItem(KEY));
    fetch("/api/store")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.crew?.length) return;
        const remote = normalize(data.crew);
        if (!remote) return;
        // Never let a stale remote wipe local adds — merge instead.
        const next = hadLocal ? mergeCrew(loadCrew(), remote) : remote;
        setEmployees(next);
        saveCrew(next);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback((next: Employee[]) => {
    setEmployees(next);
    persistDefaultCrew(next);
  }, []);

  const add = useCallback((name: string, department: string) => {
    const trimmedName = name.trim();
    const trimmedDept = department.trim();
    if (!trimmedName) return null;
    const prev = loadCrew();
    if (
      prev.some(
        (e) =>
          e.name.toLowerCase() === trimmedName.toLowerCase() &&
          e.department.toLowerCase() === trimmedDept.toLowerCase(),
      )
    ) {
      return (
        prev.find(
          (e) =>
            e.name.toLowerCase() === trimmedName.toLowerCase() &&
            e.department.toLowerCase() === trimmedDept.toLowerCase(),
        ) ?? null
      );
    }
    const person: Employee = {
      id: makeEmployeeId(trimmedName, trimmedDept, prev),
      name: trimmedName,
      department: trimmedDept,
    };
    persist([...prev, person]);
    return person;
  }, [persist]);

  const remove = useCallback(
    (id: string) => {
      persist(loadCrew().filter((e) => e.id !== id));
    },
    [persist],
  );

  const move = useCallback(
    (id: string, department: string) => {
      const trimmed = department.trim();
      if (!trimmed) return null;
      const prev = loadCrew();
      const current = prev.find((e) => e.id === id);
      if (!current) return null;
      if (current.department === trimmed) return current;
      const moved: Employee = { ...current, department: trimmed };
      persist(prev.map((e) => (e.id === id ? moved : e)));
      return moved;
    },
    [persist],
  );

  const rename = useCallback(
    (id: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return null;
      const prev = loadCrew();
      const current = prev.find((e) => e.id === id);
      if (!current) return null;
      if (current.name === trimmed) return current;
      const renamed: Employee = { ...current, name: trimmed };
      persist(prev.map((e) => (e.id === id ? renamed : e)));
      return renamed;
    },
    [persist],
  );

  const restoreOriginal = useCallback(() => {
    persist(cloneSeed());
  }, [persist]);

  return {
    employees,
    ready,
    add,
    remove,
    move,
    rename,
    saveAsDefault: persist,
    restoreOriginal,
  };
}
