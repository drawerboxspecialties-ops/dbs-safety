import { NextResponse } from "next/server";
import { readShopStore, storeBackend, writeShopStore } from "@/lib/server-store";
import { mergeShopStore } from "@/lib/shop-data";
import type { Employee } from "@/lib/employees";
import type { Topic, TopicId } from "@/lib/topics";

export const runtime = "nodejs";

export async function GET() {
  const store = await readShopStore();
  return NextResponse.json({
    ...store,
    backend: storeBackend(),
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    crew?: Employee[];
    topics?: Topic[];
    schedule?: Record<string, TopicId>;
  };
  const current = await readShopStore();
  const next = mergeShopStore({
    ...current,
    crew: body.crew ?? current.crew,
    topics: body.topics ?? current.topics,
    schedule: body.schedule ?? current.schedule,
  });
  const saved = await writeShopStore(next);
  return NextResponse.json({
    ...saved,
    backend: storeBackend(),
  });
}
