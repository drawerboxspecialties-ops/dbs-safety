import { NextResponse } from "next/server";
import { saveTopicPdf } from "@/lib/server-files";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose a PDF." }, { status: 400 });
  }
  if (file.size > 15 * 1024 * 1024) {
    return NextResponse.json({ error: "PDF must be under 15 MB." }, { status: 400 });
  }
  const type = file.type || "";
  const name = file.name.toLowerCase();
  if (type && type !== "application/pdf" && !name.endsWith(".pdf")) {
    return NextResponse.json({ error: "Upload a PDF." }, { status: 400 });
  }
  const saved = await saveTopicPdf(file);
  return NextResponse.json(saved);
}
