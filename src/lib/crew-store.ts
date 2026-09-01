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

export function useCrew() {
  const [employees, setEmployees] = useState<Employee[]>(cloneSeed);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const local = loadCrew();
    setEmployees(local);
    fetch("/api/store")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.crew?.length) return;
        setEmployees(data.crew);
        saveCrew(data.crew);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const applyLocal = useCallback((next: Employee[]) => {
    setEmployees(next);
    saveCrew(next);
  }, []);

  const persist = useCallback((next: Employee[]) => {
    applyLocal(next);
    fetch("/api/store", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ crew: next }),
    }).catch(() => undefined);
  }, [applyLocal]);

  const add = useCallback(
    (name: string, department: string) => {
      const trimmedName = name.trim();
      const trimmedDept = department.trim();
      if (!trimmedName) return null;
      const person: Employee = {
        id: makeEmployeeId(trimmedName, trimmedDept, employees),
        name: trimmedName,
        department: trimmedDept,
      };
      persist([...employees, person]);
      return person;
    },
    [employees, persist],
  );

  const remove = useCallback(
    (id: string) => {
      persist(employees.filter((e) => e.id !== id));
    },
    [employees, persist],
  );

  const move = useCallback(
    (id: string, department: string) => {
      const trimmed = department.trim();
      if (!trimmed) return null;
      const current = employees.find((e) => e.id === id);
      if (!current) return null;
      if (current.department === trimmed) return current;
      applyLocal(
        employees.map((e) =>
          e.id === id ? { ...e, department: trimmed } : e,
        ),
      );
      return { ...current, department: trimmed };
    },
    [employees, applyLocal],
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
    saveAsDefault: persist,
    restoreOriginal,
  };
}
