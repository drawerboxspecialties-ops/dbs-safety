import { withBase } from "@/lib/base-path";
import { topicFromIntake, topicPdfHref, type Topic } from "@/lib/topics";

export function packetUrl(pdf: string) {
  const href = topicPdfHref(pdf);
  if (!href) return "";
  if (
    href.startsWith("http") ||
    href.startsWith("/api/") ||
    href.startsWith("data:") ||
    href.startsWith("blob:")
  ) {
    return href;
  }
  return withBase(href);
}

export function titleFromPdfName(name: string) {
  return name
    .replace(/\.pdf$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim() || "Safety topic";
}

function readDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read PDF."));
    reader.readAsDataURL(file);
  });
}

export async function ingestPdf(file: File, existing: Topic[]): Promise<Topic> {
  if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
    throw new Error("Drop a PDF.");
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error("PDF must be under 15 MB.");
  }
  let pdf = "";
  let fileName = file.name;
  try {
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/files", { method: "POST", body });
    if (res.ok) {
      const data = (await res.json()) as { url?: string; fileName?: string };
      pdf = data.url || "";
      fileName = data.fileName || file.name;
    }
  } catch {
    pdf = "";
  }
  if (!pdf) {
    if (file.size > 4.5 * 1024 * 1024) {
      throw new Error("Could not save that PDF here. Use the shop computer.");
    }
    pdf = await readDataUrl(file);
  }
  return topicFromIntake({
    title: titleFromPdfName(file.name),
    source: "upload",
    pdf,
    fileName,
    existing,
  });
}

export function topicSourceLabel(source?: Topic["source"]) {
  if (source === "hr") return "HR";
  if (source === "ai") return "AI";
  if (source === "upload") return "Uploaded";
  return "Built in";
}
