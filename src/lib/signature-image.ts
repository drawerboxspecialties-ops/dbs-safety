/** JPEG from a transparent canvas fills empty pixels with black. Recover ink. */
export function flattenBlackInk(image: ImageData) {
  const data = image.data;
  let samples = 0;
  let dark = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 8) continue;
    samples += 1;
    if (data[i] < 28 && data[i + 1] < 28 && data[i + 2] < 28) dark += 1;
  }
  if (samples < 40 || dark / samples < 0.45) return false;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 8) continue;
    const max = Math.max(data[i], data[i + 1], data[i + 2]);
    if (max < 16) {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = 255;
    } else {
      const ink = Math.max(0, Math.min(34, max));
      data[i] = ink;
      data[i + 1] = ink;
      data[i + 2] = ink;
      data[i + 3] = 255;
    }
  }
  return true;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read that signature."));
    img.src = src;
  });
}

export async function normalizeSignature(dataUrl: string) {
  if (typeof window === "undefined") return dataUrl;
  if (!dataUrl.startsWith("data:image")) return dataUrl;
  try {
    const img = await loadImage(dataUrl);
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    if (!width || !height) return dataUrl;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0);
    const image = ctx.getImageData(0, 0, width, height);
    flattenBlackInk(image);
    ctx.putImageData(image, 0, 0);
    return canvas.toDataURL("image/png");
  } catch {
    return dataUrl;
  }
}

export function exportCanvasSignature(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  flattenBlackInk(image);
  ctx.putImageData(image, 0, 0);
  return canvas.toDataURL("image/png");
}
