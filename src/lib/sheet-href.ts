import type { TopicId } from "@/lib/topics";

export function sheetHref(
  path: string,
  topic: TopicId,
  month: string,
  extra?: Record<string, string>,
) {
  const query = new URLSearchParams({ topic, month, ...extra });
  return `${path}?${query.toString()}`;
}

export function readSheetQuery(): { topic?: string; month?: string; left?: boolean } {
  if (typeof window === "undefined") return {};
  const query = new URLSearchParams(window.location.search);
  const topic = query.get("topic")?.trim() || undefined;
  const month = query.get("month")?.trim() || undefined;
  const left = query.get("left") === "1";
  return { topic, month, left };
}
