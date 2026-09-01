const EMAIL_TO_KEY = "dbs-safety-email-to";

export function loadLastEmailTo() {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(EMAIL_TO_KEY) || "";
  } catch {
    return "";
  }
}

export function saveLastEmailTo(to: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(EMAIL_TO_KEY, to.trim());
  } catch {
    /* ignore */
  }
}

function encodeSubject(subject: string) {
  if (/^[\x20-\x7E]*$/.test(subject)) return subject;
  const bytes = new TextEncoder().encode(subject);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return `=?UTF-8?B?${btoa(binary)}?=`;
}

function base64Lines(bytes: Uint8Array) {
  let binary = "";
  const step = 0x2000;
  for (let i = 0; i < bytes.length; i += step) {
    const slice = bytes.subarray(i, i + step);
    binary += String.fromCharCode.apply(null, Array.from(slice));
  }
  const b64 = btoa(binary);
  return (b64.match(/.{1,76}/g) || [b64]).join("\r\n");
}

export function buildEmailDraft(opts: {
  to: string;
  subject: string;
  body: string;
  filename: string;
  pdf: Blob;
}): Promise<Blob> {
  return opts.pdf.arrayBuffer().then((buffer) => {
    const boundary = `dbs-${Date.now().toString(16)}`;
    const headers = [
      "MIME-Version: 1.0",
      `To: ${opts.to.trim()}`,
      `Subject: ${encodeSubject(opts.subject)}`,
      "X-Unsent: 1",
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      'Content-Type: text/plain; charset="utf-8"',
      "Content-Transfer-Encoding: 7bit",
      "",
      opts.body,
      "",
      `--${boundary}`,
      `Content-Type: application/pdf; name="${opts.filename}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${opts.filename}"`,
      "",
      base64Lines(new Uint8Array(buffer)),
      `--${boundary}--`,
      "",
    ].join("\r\n");
    return new Blob([headers], { type: "message/rfc822" });
  });
}

export async function blobFromUrl(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not download that PDF.");
  return res.blob();
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function downloadFromUrl(url: string, filename: string) {
  downloadBlob(await blobFromUrl(url), filename);
}

export async function shareSignInPdf(opts: {
  to: string;
  subject: string;
  body: string;
  filename: string;
  pdf: Blob;
}): Promise<"shared" | "eml" | "cancelled"> {
  const file = new File([opts.pdf], opts.filename, { type: "application/pdf" });
  const canShare =
    typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] });
  if (canShare) {
    try {
      await navigator.share({
        files: [file],
        title: opts.subject,
        text: opts.body,
      });
      return "shared";
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return "cancelled";
    }
  }
  const eml = await buildEmailDraft(opts);
  const emlName = opts.filename.replace(/\.pdf$/i, ".eml");
  downloadBlob(eml, emlName);
  return "eml";
}
