const CLIENT_ID_KEY = "dbs-safety-google-client-id";
const TOKEN_KEY = "dbs-safety-google-token";
const FOLDER_KEY = "dbs-safety-drive-folders";
const EMAIL_KEY = "dbs-safety-drive-email";

export const DRIVE_ROOT_FOLDER = "DBS Safety";
export const DRIVE_MEETINGS_FOLDER = "Safety Meetings";

const SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
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

async function driveJson<T>(
  token: string,
  url: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type") && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(url, { ...init, headers });
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
  return (await res.json()) as T;
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

  let rootId = await findFolder(token, DRIVE_ROOT_FOLDER);
  if (!rootId) rootId = await createFolder(token, DRIVE_ROOT_FOLDER);
  let meetingsId = await findFolder(token, DRIVE_MEETINGS_FOLDER, rootId);
  if (!meetingsId) {
    meetingsId = await createFolder(token, DRIVE_MEETINGS_FOLDER, rootId);
  }
  writeStored(FOLDER_KEY, JSON.stringify({ rootId, meetingsId } satisfies FolderCache));
  return meetingsId;
}

async function findFile(token: string, name: string, folderId: string) {
  const q = [
    `name='${escapeDriveQuery(name)}'`,
    `'${folderId}' in parents`,
    "trashed=false",
  ].join(" and ");
  const params = new URLSearchParams({
    q,
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

async function uploadPdf(
  token: string,
  folderId: string,
  name: string,
  blob: Blob,
) {
  const existing = await findFile(token, name, folderId);
  const metadata = existing
    ? { name }
    : { name, parents: [folderId] };
  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" }),
  );
  form.append("file", blob, name);
  const url = existing
    ? `https://www.googleapis.com/upload/drive/v3/files/${existing}?uploadType=multipart`
    : "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
  await driveJson<{ id: string }>(token, url, {
    method: existing ? "PATCH" : "POST",
    body: form,
  });
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
  for (const file of files) {
    await uploadPdf(token, folderId, file.name, file.blob);
  }
  notifyDrive();
  return {
    email,
    folder: `${DRIVE_ROOT_FOLDER} / ${DRIVE_MEETINGS_FOLDER}`,
  };
}
