const DB_NAME = "dbs-safety-files";
const STORE = "pdfs";
const IDB_PREFIX = "idb:";

export function isIdbTopicFile(ref: string) {
  return ref.startsWith(IDB_PREFIX);
}

export function isDataTopicFile(ref: string) {
  return ref.startsWith("data:");
}

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("Could not open file storage."));
  });
}

export async function saveTopicFileBlob(blob: Blob, name = "talk.pdf") {
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `file-${Date.now()}`;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ blob, name, savedAt: Date.now() }, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("Could not save that file."));
  });
  db.close();
  return `${IDB_PREFIX}${id}`;
}

async function readIdbRecord(id: string) {
  const db = await openDb();
  const record = await new Promise<{ blob: Blob; name?: string } | null>(
    (resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(id);
      req.onsuccess = () =>
        resolve((req.result as { blob: Blob; name?: string } | undefined) || null);
      req.onerror = () =>
        reject(req.error || new Error("Could not read that file."));
    },
  );
  db.close();
  return record;
}

function dataUrlToBlob(dataUrl: string) {
  const match = /^data:([^;,]+)?(;base64)?,([\s\S]*)$/.exec(dataUrl);
  if (!match) return null;
  const mime = match[1] || "application/pdf";
  const base64 = Boolean(match[2]);
  const body = match[3] || "";
  if (base64) {
    const binary = atob(body);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }
  return new Blob([decodeURIComponent(body)], { type: mime });
}

/** Turn a stored topic PDF ref into an object URL safe for iframe/object. */
export async function resolveTopicFileUrl(ref: string) {
  if (!ref) return "";
  if (isIdbTopicFile(ref)) {
    const record = await readIdbRecord(ref.slice(IDB_PREFIX.length));
    if (!record?.blob) return "";
    return URL.createObjectURL(record.blob);
  }
  if (isDataTopicFile(ref)) {
    const blob = dataUrlToBlob(ref);
    if (!blob) return "";
    return URL.createObjectURL(blob);
  }
  return ref;
}
