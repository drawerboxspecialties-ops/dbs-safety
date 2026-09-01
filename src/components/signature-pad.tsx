"use client";

import { useEffect, useRef, useState } from "react";
import getStroke from "perfect-freehand";
import { Redo2, Undo2, X } from "lucide-react";
import {
  exportCanvasSignature,
  normalizeSignature,
} from "@/lib/signature-image";
import { cn } from "@/lib/utils";

type Point = { x: number; y: number; pressure: number };

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

function strokePath(outline: number[][]) {
  if (!outline.length) return "";
  const d = outline.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ["M", ...outline[0], "Q"] as (string | number)[],
  );
  d.push("Z");
  return d.join(" ");
}

function fillStroke(ctx: CanvasRenderingContext2D, points: Point[], size: number) {
  if (!points.length) return;
  const input = points.map((p) => [p.x, p.y, p.pressure] as [number, number, number]);
  const outline = getStroke(input, {
    size,
    thinning: 0.55,
    smoothing: 0.62,
    streamline: 0.68,
    simulatePressure: true,
    start: { taper: 4, cap: true },
    end: { taper: 4, cap: true },
  });
  if (!outline.length) return;
  const path = new Path2D(strokePath(outline));
  ctx.fill(path);
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

  function inkSize() {
    return tall ? 3.2 : 2.2;
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
    ctx.fillStyle = "#111827";
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
    pressure: number,
    target: HTMLCanvasElement,
  ): Point {
    const rect = target.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
      pressure: pressure > 0 ? pressure : 0.5,
    };
  }

  function acceptPoint(raw: Point) {
    const pts = stroke.current;
    const last = pts[pts.length - 1];
    if (!last) {
      pts.push(raw);
      return;
    }
    const gap = dist(last, raw);
    if (gap < 0.35) return;
    if (gap > 3) {
      const steps = Math.max(2, Math.ceil(gap / 1.8));
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        pts.push({
          x: last.x + (raw.x - last.x) * t,
          y: last.y + (raw.y - last.y) * t,
          pressure: last.pressure + (raw.pressure - last.pressure) * t,
        });
      }
      return;
    }
    pts.push(raw);
  }

  function paintLiveStroke() {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    restoreInk(ctx);
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    fillStroke(ctx, stroke.current, inkSize());
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
      pointFrom(e.clientX, e.clientY, e.pressure, e.currentTarget),
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
      pointFrom(e.clientX, e.clientY, e.pressure, e.currentTarget),
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
