import { NextResponse } from "next/server";
import { readShopStore, writeShopStore } from "@/lib/server-store";
import { monthKey } from "@/lib/shop-data";

export const runtime = "nodejs";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const current = await readShopStore();
  const currentMonth = monthKey();
  const saved = await writeShopStore({
    ...current,
    currentMonth,
    currentTopic: current.schedule[currentMonth] || current.currentTopic || "",
    lastCronAt: new Date().toISOString(),
  });

  return NextResponse.json({
    ok: true,
    currentMonth: saved.currentMonth,
    currentTopic: saved.currentTopic,
    crewCount: saved.crew.length,
    topicCount: saved.topics.length,
  });
}
