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
    setEmployees(loadCrew());
    setReady(true);
  }, []);

  const persist = useCallback((next: Employee[]) => {
    setEmployees(next);
    saveCrew(next);
  }, []);

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

  const restoreOriginal = useCallback(() => {
    persist(cloneSeed());
  }, [persist]);

  return { employees, ready, add, remove, saveAsDefault: persist, restoreOriginal };
}
