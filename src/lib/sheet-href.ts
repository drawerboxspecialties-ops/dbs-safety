import type { TopicId } from "@/lib/topics";

export function sheetHref(
  path: string,
  topic: TopicId,
  month: string,
) {
  const query = new URLSearchParams({ topic, month });
  return `${path}?${query.toString()}`;
}

export function readSheetQuery(): { topic?: string; month?: string } {
  if (typeof window === "undefined") return {};
  const query = new URLSearchParams(window.location.search);
  const topic = query.get("topic")?.trim() || undefined;
  const month = query.get("month")?.trim() || undefined;
  return { topic, month };
}
