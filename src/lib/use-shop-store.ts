"use client";

import { useCallback, useEffect, useState } from "react";
import {
  emptyShopStore,
  formatMonthLabel,
  monthKey,
  yearMonths,
  type ShopStore,
} from "@/lib/shop-data";
import type { Employee } from "@/lib/employees";
import type { TopicId } from "@/lib/topics";

export function useShopStore() {
  const [store, setStore] = useState<ShopStore>(emptyShopStore);
  const [ready, setReady] = useState(false);
  const [backend, setBackend] = useState("local");
  const [note, setNote] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/store")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setStore({
          crew: data.crew,
          topics: data.topics,
          schedule: data.schedule,
          currentMonth: data.currentMonth,
          currentTopic: data.currentTopic,
          lastCronAt: data.lastCronAt || "",
          updatedAt: data.updatedAt,
        });
        setBackend(data.backend || "local");
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = useCallback(
    async (patch: {
      crew?: Employee[];
      topics?: ShopStore["topics"];
      schedule?: Record<string, TopicId>;
    }) => {
      setStore((prev) => ({
        ...prev,
        ...patch,
        updatedAt: new Date().toISOString(),
      }));
      try {
        const res = await fetch("/api/store", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!res.ok) throw new Error("Could not save");
        const data = await res.json();
        setStore({
          crew: data.crew,
          topics: data.topics,
          schedule: data.schedule,
          currentMonth: data.currentMonth,
          currentTopic: data.currentTopic,
          lastCronAt: data.lastCronAt || "",
          updatedAt: data.updatedAt,
        });
        setBackend(data.backend || "local");
        setNote("Saved.");
        return data as ShopStore;
      } catch {
        setNote("Saved on this device.");
        return null;
      }
    },
    [],
  );

  return {
    store,
    ready,
    backend,
    note,
    setNote,
    save,
    monthKey: monthKey(),
    year: new Date().getFullYear(),
    months: yearMonths(new Date().getFullYear()),
    formatMonthLabel,
  };
}
