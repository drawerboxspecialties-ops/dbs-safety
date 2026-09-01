import { EMPLOYEES, type Employee } from "@/lib/employees";
import { TOPICS, type Topic, type TopicId } from "@/lib/topics";

export type MonthKey = string;

export type ShopStore = {
  crew: Employee[];
  topics: Topic[];
  schedule: Record<MonthKey, TopicId>;
  currentMonth: MonthKey;
  currentTopic: TopicId;
  lastCronAt: string;
  updatedAt: string;
};

export function monthKey(date = new Date()): MonthKey {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function topicForMonth(key: MonthKey): TopicId {
  const month = Number(key.slice(5, 7));
  return month % 2 === 1 ? "ppe" : "material-handling";
}

export function fillSchedule(
  schedule: Record<MonthKey, TopicId>,
  from = new Date(),
) {
  const next = { ...schedule };
  for (let offset = 0; offset < 18; offset += 1) {
    const d = new Date(from.getFullYear(), from.getMonth() + offset, 1);
    const key = monthKey(d);
    if (!next[key]) next[key] = topicForMonth(key);
  }
  return next;
}

export function emptyShopStore(): ShopStore {
  const currentMonth = monthKey();
  const schedule = fillSchedule({});
  return {
    crew: EMPLOYEES.map((e) => ({ ...e })),
    topics: TOPICS.map((t) => ({ ...t })),
    schedule,
    currentMonth,
    currentTopic: schedule[currentMonth] ?? topicForMonth(currentMonth),
    lastCronAt: "",
    updatedAt: new Date().toISOString(),
  };
}

export function mergeShopStore(raw: unknown): ShopStore {
  const base = emptyShopStore();
  if (!raw || typeof raw !== "object") return base;
  const data = raw as Partial<ShopStore>;
  const crew = Array.isArray(data.crew) && data.crew.length ? data.crew : base.crew;
  const topics =
    Array.isArray(data.topics) && data.topics.length ? data.topics : base.topics;
  const schedule = fillSchedule(
    data.schedule && typeof data.schedule === "object" ? data.schedule : {},
  );
  const currentMonth = data.currentMonth || monthKey();
  return {
    crew,
    topics,
    schedule,
    currentMonth,
    currentTopic:
      data.currentTopic ||
      schedule[currentMonth] ||
      topicForMonth(currentMonth),
    lastCronAt: data.lastCronAt || "",
    updatedAt: data.updatedAt || new Date().toISOString(),
  };
}

export function formatMonthLabel(key: MonthKey) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export function yearMonths(year: number): MonthKey[] {
  return Array.from({ length: 12 }, (_, i) => {
    const m = String(i + 1).padStart(2, "0");
    return `${year}-${m}`;
  });
}
