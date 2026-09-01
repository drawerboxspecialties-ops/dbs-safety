"use client";

import { useCallback, useEffect, useState } from "react";
import {
  emptyShopStore,
  formatMonthLabel,
  mergeShopStore,
  monthKey,
  yearMonths,
  type ShopStore,
} from "@/lib/shop-data";
import type { Employee } from "@/lib/employees";
import type { TopicId } from "@/lib/topics";

const SHOP_KEY = "dbs-safety-shop";

function loadLocalShop(): ShopStore | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SHOP_KEY);
    if (!raw) return null;
    return mergeShopStore(JSON.parse(raw));
  } catch {
    return null;
  }
}

function writeLocalShop(store: ShopStore) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SHOP_KEY, JSON.stringify(store));
  } catch {
    /* ignore quota */
  }
}

function newerStore(a: ShopStore, b: ShopStore) {
  const aTime = Date.parse(a.updatedAt) || 0;
  const bTime = Date.parse(b.updatedAt) || 0;
  if (aTime === bTime) {
    return Object.keys(a.schedule).length >= Object.keys(b.schedule).length
      ? a
      : b;
  }
  return aTime > bTime ? a : b;
}

export function useShopStore() {
  const [store, setStore] = useState<ShopStore>(emptyShopStore);
  const [ready, setReady] = useState(false);
  const [backend, setBackend] = useState("local");
  const [note, setNote] = useState("");

  useEffect(() => {
    let cancelled = false;
    const local = loadLocalShop();
    if (local) setStore(local);
    fetch("/api/store")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const remote = mergeShopStore(data);
        const next = local ? newerStore(remote, local) : remote;
        setStore(next);
        writeLocalShop(next);
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
      const next = await new Promise<ShopStore>((resolve) => {
        setStore((prev) => {
          const updated = {
            ...prev,
            ...patch,
            updatedAt: new Date().toISOString(),
          };
          writeLocalShop(updated);
          resolve(updated);
          return updated;
        });
      });
      try {
        const res = await fetch("/api/store", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!res.ok) throw new Error("Could not save");
        const data = await res.json();
        const remote = mergeShopStore(data);
        setStore(remote);
        writeLocalShop(remote);
        setBackend(data.backend || "local");
        setNote("Saved.");
        return remote;
      } catch {
        setNote("Saved on this device.");
        return next;
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
