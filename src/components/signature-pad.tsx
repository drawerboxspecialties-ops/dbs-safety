"use client";

import { useEffect, useRef, useState } from "react";
import { Redo2, Undo2, X } from "lucide-react";
import {
  exportCanvasSignature,
  normalizeSignature,
} from "@/lib/signature-image";
import { cn } from "@/lib/utils";

type Point = { x: number; y: number; t: number; pressure: number };

function fillPaper(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

function dist(a: Point, b: Point) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function mixPoints(a: Point, b: Point, ta: number, tb: number, t: number): Point {
  const span = tb - ta || 1;
  const u = (tb - t) / span;
  const v = (t - ta) / span;
  return {
    x: u * a.x + v * b.x,
    y: u * a.y + v * b.y,
    t: u * a.t + v * b.t,
    pressure: u * a.pressure + v * b.pressure,
  };
}

/** Centripetal Catmull-Rom: smooth arcs without looping on sharp turns. */
function catmull(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const t0 = 0;
  const t1 = t0 + Math.pow(Math.max(dist(p0, p1), 1e-3), 0.5);
  const t2 = t1 + Math.pow(Math.max(dist(p1, p2), 1e-3), 0.5);
  const t3 = t2 + Math.pow(Math.max(dist(p2, p3), 1e-3), 0.5);
  const tt = t1 + (t2 - t1) * t;
  const a1 = mixPoints(p0, p1, t0, t1, tt);
  const a2 = mixPoints(p1, p2, t1, t2, tt);
  const a3 = mixPoints(p2, p3, t2, t3, tt);
  const b1 = mixPoints(a1, a2, t0, t2, tt);
  const b2 = mixPoints(a2, a3, t1, t3, tt);
  return mixPoints(b1, b2, t1, t2, tt);
}

function densifyStroke(points: Point[]) {
  if (points.length < 2) return points;
  const out: Point[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const gap = dist(p1, p2);
    const steps = Math.max(10, Math.min(48, Math.ceil(gap / 0.9)));
    for (let s = 0; s < steps; s++) {
      out.push(catmull(p0, p1, p2, p3, s / steps));
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

export function SignaturePad({
  value,
  onChange,
  size = "inline",
}: {
  value: string;
  onChange: (dataUrl: string) => void;
  size?: "inline" | "dialog";
}) {
  const tall = size === "dialog";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const valueRef = useRef(value);
  const drawing = useRef(false);
  const stroke = useRef<Point[]>([]);
  const inkRef = useRef<HTMLCanvasElement | null>(null);
  const history = useRef<string[]>(value ? [value] : []);
  const index = useRef(value ? 0 : -1);
  const skipSync = useRef(false);
  const [canUndo, setCanUndo] = useState(Boolean(value));
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  function setFlags() {
    setCanUndo(index.current >= 0);
    setCanRedo(index.current < history.current.length - 1);
  }

  function inkWidth() {
    return tall ? { min: 2, max: 4.2, start: 2.8 } : { min: 1.4, max: 2.8, start: 2 };
  }

  function inkLayer(canvas: HTMLCanvasElement) {
    let ink = inkRef.current;
    if (!ink) {
      ink = document.createElement("canvas");
      inkRef.current = ink;
    }
    if (ink.width !== canvas.width || ink.height !== canvas.height) {
      ink.width = canvas.width;
      ink.height = canvas.height;
    }
    return ink;
  }

  function stampInk(canvas: HTMLCanvasElement) {
    const ink = inkLayer(canvas);
    const ictx = ink.getContext("2d");
    if (!ictx) return;
    ictx.setTransform(1, 0, 0, 1, 0, 0);
    ictx.clearRect(0, 0, ink.width, ink.height);
    ictx.drawImage(canvas, 0, 0);
  }

  function restoreInk(ctx: CanvasRenderingContext2D) {
    const ink = inkRef.current;
    if (!ink) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(ink, 0, 0);
    ctx.restore();
  }

  function setupContext() {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    const resized = canvas.width !== w || canvas.height !== h;
    if (resized) {
      canvas.width = w;
      canvas.height = h;
    }
    const ctx = canvas.getContext("2d", {
      alpha: false,
      desynchronized: true,
    });
    if (!ctx) return null;
    if (resized) fillPaper(canvas, ctx);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111827";
    ctx.fillStyle = "#111827";
    ctx.miterLimit = 2;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctxRef.current = ctx;
    return { ctx, canvas, rect };
  }

  function paintStored() {
    const ready = setupContext();
    if (!ready) return;
    const { ctx, canvas, rect } = ready;
    fillPaper(canvas, ctx);
    const stored = valueRef.current;
    if (!stored) return;
    const token = stored;
    void normalizeSignature(stored).then((src) => {
      if (valueRef.current !== token) return;
      const img = new Image();
      img.onload = () => {
        if (valueRef.current !== token) return;
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
      };
      img.src = src;
    });
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    paintStored();
    const ro = new ResizeObserver(() => paintStored());
    ro.observe(canvas);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (skipSync.current) {
      skipSync.current = false;
      return;
    }
    if (value && history.current.length === 0) {
      history.current = [value];
      index.current = 0;
      setFlags();
    }
    if (!value && history.current.length === 0) {
      index.current = -1;
      setFlags();
    }
    paintStored();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function pointFrom(
    clientX: number,
    clientY: number,
    timeStamp: number,
    pressure: number,
    target: HTMLCanvasElement,
  ): Point {
    const rect = target.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
      t: timeStamp || performance.now(),
      pressure: pressure > 0 ? pressure : 0.5,
    };
  }

  function nextWidth(p: Point, prev: Point, current: number) {
    const { min, max } = inkWidth();
    const dt = Math.max(8, p.t - prev.t);
    const speed = Math.hypot(p.x - prev.x, p.y - prev.y) / dt;
    const fromSpeed = max - (max - min) * Math.min(1, speed * 8);
    const fromPressure = min + (max - min) * Math.min(1, p.pressure * 1.35);
    const target = p.pressure > 0.08 ? (fromSpeed + fromPressure) / 2 : fromSpeed;
    return current + (target - current) * 0.22;
  }

  function acceptPoint(raw: Point) {
    const pts = stroke.current;
    const last = pts[pts.length - 1];
    if (!last) {
      pts.push(raw);
      return;
    }
    const gap = Math.hypot(raw.x - last.x, raw.y - last.y);
    if (gap < 0.4) return;
    if (gap > 10) {
      pts.push(raw);
      return;
    }
    pts.push({
      x: last.x + (raw.x - last.x) * 0.62,
      y: last.y + (raw.y - last.y) * 0.62,
      t: raw.t,
      pressure: last.pressure + (raw.pressure - last.pressure) * 0.62,
    });
  }

  function drawSmoothStroke(ctx: CanvasRenderingContext2D) {
    const pts = stroke.current;
    if (!pts.length) return;
    const { start } = inkWidth();
    if (pts.length === 1) {
      ctx.beginPath();
      ctx.arc(pts[0].x, pts[0].y, start / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    const curve = densifyStroke(pts);
    let width = start;
    const widths = [width];
    for (let i = 1; i < curve.length; i++) {
      width = nextWidth(curve[i], curve[i - 1], width);
      widths.push(width);
    }

    const left: { x: number; y: number }[] = [];
    const right: { x: number; y: number }[] = [];
    for (let i = 0; i < curve.length; i++) {
      const prev = curve[i === 0 ? 0 : i - 1];
      const next = curve[i === curve.length - 1 ? i : i + 1];
      let dx = next.x - prev.x;
      let dy = next.y - prev.y;
      const len = Math.hypot(dx, dy);
      if (len < 1e-4) {
        dx = 1;
        dy = 0;
      } else {
        dx /= len;
        dy /= len;
      }
      const radius = widths[i] / 2;
      left.push({ x: curve[i].x - dy * radius, y: curve[i].y + dx * radius });
      right.push({ x: curve[i].x + dy * radius, y: curve[i].y - dx * radius });
    }

    const outline = left.concat(right.reverse());
    ctx.beginPath();
    ctx.moveTo(outline[0].x, outline[0].y);
    for (let i = 1; i < outline.length - 1; i++) {
      const xc = (outline[i].x + outline[i + 1].x) / 2;
      const yc = (outline[i].y + outline[i + 1].y) / 2;
      ctx.quadraticCurveTo(outline[i].x, outline[i].y, xc, yc);
    }
    ctx.lineTo(outline[outline.length - 1].x, outline[outline.length - 1].y);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.arc(curve[0].x, curve[0].y, widths[0] / 2, 0, Math.PI * 2);
    ctx.arc(
      curve[curve.length - 1].x,
      curve[curve.length - 1].y,
      widths[widths.length - 1] / 2,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  function paintLiveStroke() {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    restoreInk(ctx);
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawSmoothStroke(ctx);
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const ready = setupContext();
    if (!ready) return;
    stampInk(ready.canvas);
    drawing.current = true;
    stroke.current = [];
    acceptPoint(
      pointFrom(e.clientX, e.clientY, e.timeStamp, e.pressure, e.currentTarget),
    );
    paintLiveStroke();
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    if (!ctxRef.current) return;
    const native = e.nativeEvent;
    const samples =
      typeof native.getCoalescedEvents === "function"
        ? native.getCoalescedEvents()
        : [native];
    for (const sample of samples) {
      acceptPoint(
        pointFrom(
          sample.clientX,
          sample.clientY,
          sample.timeStamp,
          sample.pressure,
          e.currentTarget,
        ),
      );
    }
    paintLiveStroke();
  }

  function commit(next: string) {
    history.current = history.current.slice(0, index.current + 1);
    history.current.push(next);
    index.current = history.current.length - 1;
    setFlags();
    skipSync.current = true;
    onChange(next);
  }

  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    acceptPoint(
      pointFrom(e.clientX, e.clientY, e.timeStamp, e.pressure, e.currentTarget),
    );
    drawing.current = false;
    paintLiveStroke();
    stroke.current = [];
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    const canvas = canvasRef.current;
    if (canvas) commit(exportCanvasSignature(canvas));
  }

  function applyAt(nextIndex: number) {
    index.current = nextIndex;
    const next = nextIndex < 0 ? "" : history.current[nextIndex];
    setFlags();
    skipSync.current = false;
    onChange(next);
  }

  function undo(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (index.current < 0) return;
    applyAt(index.current - 1);
  }

  function redo(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (index.current >= history.current.length - 1) return;
    applyAt(index.current + 1);
  }

  function clear(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!value && index.current < 0) return;
    commit("");
    const ready = setupContext();
    if (ready) fillPaper(ready.canvas, ready.ctx);
  }

  const box = tall ? "h-52" : "h-8";
  const icon = tall ? "size-5" : "size-3.5";

  return (
    <div className={tall ? "flex flex-col gap-2" : "flex items-center gap-0.5"}>
      <div className={`relative min-w-0 flex-1 ${box}`}>
        <canvas
          ref={canvasRef}
          className={`${box} w-full cursor-crosshair touch-none bg-white print:hidden`}
          style={{ touchAction: "none", colorScheme: "light" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
        {value ? (
          <SignatureImage
            src={value}
            className={`hidden ${box} w-full object-contain object-left print:block`}
          />
        ) : (
          <div className="pointer-events-none absolute inset-x-1 bottom-1 hidden border-b border-black print:block" />
        )}
      </div>
      <div className="flex shrink-0 justify-end print:hidden">
        <button
          type="button"
          title="Undo"
          aria-label="Undo signature"
          disabled={!canUndo}
          onClick={undo}
          className="rounded p-1 text-neutral-700 disabled:opacity-30"
        >
          <Undo2 className={icon} />
        </button>
        <button
          type="button"
          title="Redo"
          aria-label="Redo signature"
          disabled={!canRedo}
          onClick={redo}
          className="rounded p-1 text-neutral-700 disabled:opacity-30"
        >
          <Redo2 className={icon} />
        </button>
        <button
          type="button"
          title="Clear"
          aria-label="Clear signature"
          disabled={!canUndo}
          onClick={clear}
          className="rounded p-1 text-neutral-700 disabled:opacity-30"
        >
          <X className={icon} />
        </button>
      </div>
    </div>
  );
}

export function SignatureImage({
  src,
  alt = "",
  className,
}: {
  src: string;
  alt?: string;
  className?: string;
}) {
  const [clean, setClean] = useState<{ src: string; href: string } | null>(
    null,
  );

  useEffect(() => {
    if (!src) return;
    let live = true;
    void normalizeSignature(src).then((href) => {
      if (live) setClean({ src, href });
    });
    return () => {
      live = false;
    };
  }, [src]);

  if (!src) return null;
  const href = clean?.src === src ? clean.href : src;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={href} alt={alt} className={cn("bg-white", className)} />
  );
}
