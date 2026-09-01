import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  emptyShopStore,
  mergeShopStore,
  type ShopStore,
} from "@/lib/shop-data";

const BLOB_NAME = "dbs-safety-store.json";

function localPath() {
  if (process.env.VERCEL) {
    return path.join("/tmp", BLOB_NAME);
  }
  return path.join(process.cwd(), "data", BLOB_NAME);
}

async function readBlob(): Promise<ShopStore | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: BLOB_NAME });
    const file = blobs.find((b) => b.pathname === BLOB_NAME);
    if (!file) return null;
    const res = await fetch(file.url);
    if (!res.ok) return null;
    return mergeShopStore(await res.json());
  } catch {
    return null;
  }
}

async function writeBlob(store: ShopStore) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return false;
  try {
    const { put } = await import("@vercel/blob");
    await put(BLOB_NAME, JSON.stringify(store, null, 2), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
    return true;
  } catch {
    return false;
  }
}

async function readFileStore(): Promise<ShopStore | null> {
  try {
    const raw = await readFile(localPath(), "utf8");
    return mergeShopStore(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function writeFileStore(store: ShopStore) {
  const file = localPath();
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(store, null, 2));
}

export async function readShopStore(): Promise<ShopStore> {
  const fromBlob = await readBlob();
  if (fromBlob) return fromBlob;
  const fromFile = await readFileStore();
  if (fromFile) return fromFile;
  return emptyShopStore();
}

export async function writeShopStore(store: ShopStore): Promise<ShopStore> {
  const next = {
    ...mergeShopStore(store),
    updatedAt: new Date().toISOString(),
  };
  await writeBlob(next);
  try {
    await writeFileStore(next);
  } catch {
    /* read-only deploy without blob still returns the payload */
  }
  return next;
}

export function storeBackend() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return "vercel-blob";
  if (process.env.VERCEL) return "ephemeral";
  return "local-file";
}
