import { jsPDF } from "jspdf";
import { withBase } from "@/lib/base-path";
import { saveTopicFileBlob } from "@/lib/topic-files";
import { topicFromIntake, topicPdfHref, type Topic } from "@/lib/topics";

const IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);

export function packetUrl(pdf: string) {
  const href = topicPdfHref(pdf);
  if (!href) return "";
  if (
    href.startsWith("http") ||
    href.startsWith("/api/") ||
    href.startsWith("data:") ||
    href.startsWith("blob:") ||
    href.startsWith("idb:")
  ) {
    return href;
  }
  return withBase(href);
}

export function titleFromPdfName(name: string) {
  return (
    name
      .replace(/\.(pdf|png|jpe?g|webp|gif)$/i, "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim() || "Safety topic"
  );
}

function readDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read that image."));
    img.src = src;
  });
}

function isPdfFile(file: File) {
  const name = file.name.toLowerCase();
  return file.type === "application/pdf" || name.endsWith(".pdf");
}

function isImageFile(file: File) {
  const name = file.name.toLowerCase();
  if (IMAGE_TYPES.has(file.type)) return true;
  return /\.(png|jpe?g|webp|gif)$/i.test(name);
}

async function imageToPdfFile(file: File): Promise<File> {
  const dataUrl = await readDataUrl(file);
  const img = await loadImage(dataUrl);
  const pageW = 612;
  const pageH = 792;
  const margin = 36;
  const maxW = pageW - margin * 2;
  const maxH = pageH - margin * 2;
  const scale = Math.min(maxW / img.width, maxH / img.height, 1);
  const w = Math.max(1, img.width * scale);
  const h = Math.max(1, img.height * scale);
  const x = (pageW - w) / 2;
  const y = (pageH - h) / 2;
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const format = /png/i.test(file.type || file.name) ? "PNG" : "JPEG";
  doc.addImage(dataUrl, format, x, y, w, h);
  const blob = doc.output("blob");
  const base = file.name.replace(/\.[^.]+$/, "") || "safety-topic";
  return new File([blob], `${base}.pdf`, { type: "application/pdf" });
}

export async function normalizeTopicUpload(file: File): Promise<File> {
  if (isPdfFile(file)) return file;
  if (isImageFile(file)) return imageToPdfFile(file);
  throw new Error("Drop a PDF or an image (PNG, JPG, WEBP).");
}

export async function ingestPdf(file: File, existing: Topic[]): Promise<Topic> {
  const ready = await normalizeTopicUpload(file);
  if (ready.size > 25 * 1024 * 1024) {
    throw new Error("File must be under 25 MB.");
  }
  let pdf = "";
  let fileName = ready.name;
  try {
    const body = new FormData();
    body.append("file", ready);
    const res = await fetch("/api/files", { method: "POST", body });
    if (res.ok) {
      const data = (await res.json()) as { url?: string; fileName?: string };
      pdf = data.url || "";
      fileName = data.fileName || ready.name;
    }
  } catch {
    pdf = "";
  }
  if (!pdf) {
    try {
      pdf = await saveTopicFileBlob(ready, ready.name);
    } catch {
      if (ready.size > 4.5 * 1024 * 1024) {
        throw new Error(
          "Could not save that file on this device. Try a smaller PDF or image.",
        );
      }
      pdf = await readDataUrl(ready);
    }
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
