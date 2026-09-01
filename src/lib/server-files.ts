import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

function safeName(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const ext = base.endsWith(".pdf") ? "" : ".pdf";
  return `${Date.now()}-${base || "topic"}${ext}`;
}

function localDir() {
  if (process.env.VERCEL) return path.join("/tmp", "dbs-topic-files");
  return path.join(process.cwd(), "data", "files");
}

export async function saveTopicPdf(file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const fileName = safeName(file.name || "topic.pdf");

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const uploaded = await put(`topics/${fileName}`, bytes, {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/pdf",
    });
    return { url: uploaded.url, fileName };
  }

  const dir = localDir();
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, fileName), bytes);
  return { url: `/api/files/${fileName}`, fileName };
}

export async function readTopicPdf(fileName: string) {
  const clean = path.basename(fileName);
  if (clean !== fileName || clean.includes("..")) return null;
  try {
    return await readFile(path.join(localDir(), clean));
  } catch {
    return null;
  }
}
