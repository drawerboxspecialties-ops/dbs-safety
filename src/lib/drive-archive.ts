const CLIENT_ID_KEY = "dbs-safety-google-client-id";
const TOKEN_KEY = "dbs-safety-google-token";
const FOLDER_KEY = "dbs-safety-drive-folders";
const FILE_IDS_KEY = "dbs-safety-drive-file-ids";
const EMAIL_KEY = "dbs-safety-drive-email";

export const DRIVE_ROOT_FOLDER = "DBS Safety";
export const DRIVE_MEETINGS_FOLDER = "Safety Meetings";
export const DRIVE_ROOT_FOLDER_ID = "1x-owvJScsbEdHfXHANsvNPX4Uki0OeRP";
export const DRIVE_MEETINGS_FOLDER_ID = "11E67WkJF0_hJ8xzf694FhTmGSdShd6mK";
export const DRIVE_MEETINGS_URL =
  "https://drive.google.com/drive/folders/11E67WkJF0_hJ8xzf694FhTmGSdShd6mK";

const SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

const GSI_SRC = "https://accounts.google.com/gsi/client";

type TokenCache = {
  access_token: string;
  expires_at: number;
};

type FolderCache = {
  rootId: string;
  meetingsId: string;
};

type TokenResponse = {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

type TokenClient = {
  requestAccessToken: (override?: { prompt?: string }) => void;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (resp: TokenResponse) => void;
            error_callback?: (err: { message?: string; type?: string }) => void;
          }) => TokenClient;
          revoke?: (token: string, done?: () => void) => void;
        };
      };
    };
  }
}

const listeners = new Set<() => void>();

function notifyDrive() {
  for (const fn of listeners) fn();
}

export function subscribeDriveStatus(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export type DriveStatus = {
  clientId: string;
  email: string;
  connected: boolean;
};

export function readDriveStatus(): DriveStatus {
  const clientId = getGoogleClientId();
  const email = readStored(EMAIL_KEY);
  return {
    clientId,
    email,
    connected: Boolean(clientId && (email || readCachedToken())),
  };
}

function readStored(key: string) {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function writeStored(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    if (value) window.localStorage.setItem(key, value);
    else window.localStorage.removeItem(key);
  } catch {
    /* ignore quota */
  }
}

export function getGoogleClientId() {
  const fromEnv = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
  return readStored(CLIENT_ID_KEY) || fromEnv;
}

export function setGoogleClientId(id: string) {
  writeStored(CLIENT_ID_KEY, id.trim());
  notifyDrive();
}

export function hasGoogleClientId() {
  return Boolean(getGoogleClientId());
}

function readCachedToken(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = window.sessionStorage.getItem(TOKEN_KEY);
    if (!raw) return "";
    const cached = JSON.parse(raw) as TokenCache;
    if (!cached.access_token) return "";
    if (cached.expires_at - 60_000 <= Date.now()) return "";
    return cached.access_token;
  } catch {
    return "";
  }
}

function writeCachedToken(token: string, expiresInSec: number) {
  if (typeof window === "undefined") return;
  const cache: TokenCache = {
    access_token: token,
    expires_at: Date.now() + Math.max(60, expiresInSec) * 1000,
  };
  try {
    window.sessionStorage.setItem(TOKEN_KEY, JSON.stringify(cache));
  } catch {
    /* ignore */
  }
}

function clearCachedToken() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export function preloadGoogleSignIn() {
  return loadGsi().catch(() => undefined);
}

function loadGsi(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Drive only works in the browser."));
  }
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GSI_SRC}"]`,
    );
    if (existing) {
      if (window.google?.accounts?.oauth2) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Could not load Google sign-in.")),
        { once: true },
      );
      return;
    }
    const script = document.createElement("script");
    script.src = GSI_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Google sign-in."));
    document.head.appendChild(script);
  });
}

async function requestAccessToken(prompt: "" | "consent") {
  const clientId = getGoogleClientId();
  if (!clientId) {
    throw new Error("Paste a Google client ID first.");
  }
  await loadGsi();
  const oauth = window.google?.accounts?.oauth2;
  if (!oauth) throw new Error("Google sign-in is not ready.");
  return new Promise<string>((resolve, reject) => {
    const client = oauth.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: (resp) => {
        if (!resp.access_token || resp.error) {
          reject(
            new Error(
              resp.error_description ||
                resp.error ||
                "Google sign-in did not finish.",
            ),
          );
          return;
        }
        writeCachedToken(resp.access_token, Number(resp.expires_in || 3600));
        resolve(resp.access_token);
      },
      error_callback: (err) => {
        reject(new Error(err?.message || "Google sign-in was cancelled."));
      },
    });
    client.requestAccessToken({ prompt });
  });
}

async function accessToken(forcePrompt = false) {
  if (!forcePrompt) {
    const cached = readCachedToken();
    if (cached) return cached;
  }
  try {
    return await requestAccessToken(forcePrompt ? "consent" : "");
  } catch (err) {
    if (forcePrompt) throw err;
    return requestAccessToken("consent");
  }
}

function escapeDriveQuery(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function withDriveFlags(url: string, listing = false) {
  const next = new URL(url);
  if (!next.hostname.endsWith("googleapis.com")) return url;
  next.searchParams.set("supportsAllDrives", "true");
  if (listing) next.searchParams.set("includeItemsFromAllDrives", "true");
  return next.toString();
}

async function driveResponse<T>(token: string, res: Response): Promise<T> {
  if (res.status === 401) {
    clearCachedToken();
    writeStored(EMAIL_KEY, "");
    notifyDrive();
    throw new Error("Google Drive sign-in expired. Connect Drive again.");
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(driveErrorMessage(res.status, text));
  }
  if (res.status === 204) return {} as T;
  const type = res.headers.get("content-type") || "";
  if (!type.includes("json")) return {} as T;
  return (await res.json()) as T;
}

async function driveJson<T>(
  token: string,
  url: string,
  init: RequestInit = {},
): Promise<T> {
  const listing = !init.method || init.method === "GET";
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(withDriveFlags(url, listing && url.includes("/files?")), {
    ...init,
    headers,
  });
  return driveResponse<T>(token, res);
}

async function driveUpload<T>(
  token: string,
  url: string,
  method: "POST" | "PATCH",
  body: BodyInit,
  contentType: string,
): Promise<T> {
  const headers = new Headers();
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Content-Type", contentType);
  const res = await fetch(withDriveFlags(url), { method, headers, body });
  return driveResponse<T>(token, res);
}

function driveErrorMessage(status: number, body: string) {
  if (status === 403) {
    return "Google Drive blocked this upload. Check that Drive API is on and this Google account is allowed.";
  }
  if (status === 404) return "That Drive folder is gone. The app will make it again on the next save.";
  const snippet = body.replace(/\s+/g, " ").slice(0, 160);
  return snippet || `Google Drive returned ${status}.`;
}

async function findFolder(token: string, name: string, parentId?: string) {
  const parts = [
    `name='${escapeDriveQuery(name)}'`,
    "mimeType='application/vnd.google-apps.folder'",
    "trashed=false",
  ];
  if (parentId) parts.push(`'${parentId}' in parents`);
  const params = new URLSearchParams({
    q: parts.join(" and "),
    spaces: "drive",
    fields: "files(id,name)",
    pageSize: "5",
  });
  const data = await driveJson<{ files?: { id: string }[] }>(
    token,
    `https://www.googleapis.com/drive/v3/files?${params}`,
  );
  return data.files?.[0]?.id || "";
}

async function createFolder(token: string, name: string, parentId?: string) {
  const data = await driveJson<{ id: string }>(
    token,
    "https://www.googleapis.com/drive/v3/files",
    {
      method: "POST",
      body: JSON.stringify({
        name,
        mimeType: "application/vnd.google-apps.folder",
        ...(parentId ? { parents: [parentId] } : {}),
      }),
    },
  );
  return data.id;
}

async function folderStillThere(token: string, id: string) {
  try {
    const data = await driveJson<{ id?: string; trashed?: boolean }>(
      token,
      `https://www.googleapis.com/drive/v3/files/${id}?fields=id,trashed`,
    );
    return Boolean(data.id) && !data.trashed;
  } catch {
    return false;
  }
}

async function meetingsFolderId(token: string) {
  if (await folderStillThere(token, DRIVE_MEETINGS_FOLDER_ID)) {
    writeStored(
      FOLDER_KEY,
      JSON.stringify({
        rootId: DRIVE_ROOT_FOLDER_ID,
        meetingsId: DRIVE_MEETINGS_FOLDER_ID,
      } satisfies FolderCache),
    );
    return DRIVE_MEETINGS_FOLDER_ID;
  }

  try {
    const raw = readStored(FOLDER_KEY);
    if (raw) {
      const cached = JSON.parse(raw) as FolderCache;
      if (cached.meetingsId && (await folderStillThere(token, cached.meetingsId))) {
        return cached.meetingsId;
      }
    }
  } catch {
    /* recreate */
  }

  let rootId =
    (await folderStillThere(token, DRIVE_ROOT_FOLDER_ID) && DRIVE_ROOT_FOLDER_ID) ||
    (await findFolder(token, DRIVE_ROOT_FOLDER));
  if (!rootId) rootId = await createFolder(token, DRIVE_ROOT_FOLDER);
  let meetingsId = await findFolder(token, DRIVE_MEETINGS_FOLDER, rootId);
  if (!meetingsId) {
    meetingsId = await createFolder(token, DRIVE_MEETINGS_FOLDER, rootId);
  }
  writeStored(FOLDER_KEY, JSON.stringify({ rootId, meetingsId } satisfies FolderCache));
  return meetingsId;
}

type DriveFile = { id: string; name: string; createdTime?: string };

function readFileIdCache(): Record<string, string> {
  try {
    const raw = readStored(FILE_IDS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeFileIdCache(cache: Record<string, string>) {
  writeStored(FILE_IDS_KEY, JSON.stringify(cache));
}

async function fileStillThere(token: string, id: string) {
  try {
    const data = await driveJson<{ id?: string; trashed?: boolean }>(
      token,
      `https://www.googleapis.com/drive/v3/files/${id}?fields=id,trashed`,
    );
    return Boolean(data.id) && !data.trashed;
  } catch {
    return false;
  }
}

async function listNamedFiles(
  token: string,
  name: string,
  folderId?: string,
): Promise<DriveFile[]> {
  const found: DriveFile[] = [];
  let pageToken = "";
  do {
    const parts = [
      `name='${escapeDriveQuery(name)}'`,
      "trashed=false",
    ];
    if (folderId) parts.push(`'${folderId}' in parents`);
    const params = new URLSearchParams({
      q: parts.join(" and "),
      spaces: "drive",
      fields: "nextPageToken,files(id,name,createdTime)",
      pageSize: "100",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const data = await driveJson<{
      files?: DriveFile[];
      nextPageToken?: string;
    }>(token, `https://www.googleapis.com/drive/v3/files?${params}`);
    found.push(...(data.files || []));
    pageToken = data.nextPageToken || "";
  } while (pageToken);
  found.sort((a, b) => (a.createdTime || "").localeCompare(b.createdTime || ""));
  return found;
}

async function trashFile(token: string, id: string) {
  try {
    await driveJson(
      token,
      `https://www.googleapis.com/drive/v3/files/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ trashed: true }),
      },
    );
  } catch {
    /* leftover copy may already be gone */
  }
}

async function replacePdfContent(token: string, fileId: string, blob: Blob) {
  await driveUpload(
    token,
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
    "PATCH",
    blob,
    "application/pdf",
  );
}

async function createPdf(
  token: string,
  folderId: string,
  name: string,
  blob: Blob,
) {
  const boundary = `dbs_${crypto.randomUUID().replace(/-/g, "")}`;
  const metadata = JSON.stringify({
    name,
    parents: [folderId],
    mimeType: "application/pdf",
  });
  const head =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${metadata}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/pdf\r\n\r\n`;
  const body = new Blob([head, blob, `\r\n--${boundary}--`]);
  return driveUpload<{ id: string }>(
    token,
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
    "POST",
    body,
    `multipart/related; boundary=${boundary}`,
  );
}

async function uploadPdf(
  token: string,
  folderId: string,
  name: string,
  blob: Blob,
) {
  const cache = readFileIdCache();
  let keepId = "";
  const cachedId = cache[name];
  if (cachedId && (await fileStillThere(token, cachedId))) {
    keepId = cachedId;
  }

  let matches = await listNamedFiles(token, name, folderId);
  if (!matches.length) matches = await listNamedFiles(token, name);
  if (!keepId) keepId = matches[0]?.id || "";

  let replaced = false;
  if (keepId) {
    await replacePdfContent(token, keepId, blob);
    await driveJson(token, `https://www.googleapis.com/drive/v3/files/${keepId}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    });
    replaced = true;
  } else {
    const created = await createPdf(token, folderId, name, blob);
    keepId = created.id;
    matches = await listNamedFiles(token, name, folderId);
  }

  cache[name] = keepId;
  writeFileIdCache(cache);

  for (const file of matches) {
    if (file.id !== keepId) await trashFile(token, file.id);
  }

  return { id: keepId, replaced };
}

async function readAccountEmail(token: string) {
  try {
    const data = await driveJson<{ email?: string }>(
      token,
      "https://www.googleapis.com/oauth2/v2/userinfo",
    );
    return data.email || "";
  } catch {
    return "";
  }
}

export async function connectGoogleDrive() {
  const token = await accessToken(true);
  const email = await readAccountEmail(token);
  writeStored(EMAIL_KEY, email);
  notifyDrive();
  await meetingsFolderId(token);
  return email;
}

export async function disconnectGoogleDrive() {
  const token = readCachedToken();
  if (token && window.google?.accounts?.oauth2?.revoke) {
    await new Promise<void>((resolve) => {
      window.google?.accounts?.oauth2?.revoke?.(token, () => resolve());
      window.setTimeout(() => resolve(), 1500);
    });
  }
  clearCachedToken();
  writeStored(EMAIL_KEY, "");
  notifyDrive();
}

export async function uploadMeetingPdfs(
  files: { name: string; blob: Blob }[],
) {
  const token = await accessToken(false);
  const email = (await readAccountEmail(token)) || readStored(EMAIL_KEY);
  if (email) writeStored(EMAIL_KEY, email);
  const folderId = await meetingsFolderId(token);
  let replaced = false;
  for (const file of files) {
    const result = await uploadPdf(token, folderId, file.name, file.blob);
    if (result.replaced) replaced = true;
  }
  notifyDrive();
  return {
    email,
    folder: `${DRIVE_ROOT_FOLDER} / ${DRIVE_MEETINGS_FOLDER}`,
    replaced,
  };
}
