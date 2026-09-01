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

function mid(a: Point, b: Point): Point {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    t: (a.t + b.t) / 2,
    pressure: (a.pressure + b.pressure) / 2,
  };
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
  const widthRef = useRef(tall ? 2.6 : 1.9);
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
    return tall ? { min: 1.7, max: 3.6, start: 2.6 } : { min: 1.2, max: 2.5, start: 1.9 };
  }

  function setupContext() {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
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

  function nextWidth(p: Point, prev: Point) {
    const { min, max } = inkWidth();
    const dt = Math.max(8, p.t - prev.t);
    const speed = Math.hypot(p.x - prev.x, p.y - prev.y) / dt;
    const fromSpeed = max - (max - min) * Math.min(1, speed * 10);
    const fromPressure = min + (max - min) * Math.min(1, p.pressure * 1.35);
    const target = p.pressure > 0.08 ? (fromSpeed + fromPressure) / 2 : fromSpeed;
    widthRef.current += (target - widthRef.current) * 0.28;
    return widthRef.current;
  }

  function drawDot(ctx: CanvasRenderingContext2D, p: Point) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, inkWidth().start / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawCurve(
    ctx: CanvasRenderingContext2D,
    from: Point,
    control: Point,
    to: Point,
    width: number,
  ) {
    ctx.beginPath();
    ctx.lineWidth = width;
    ctx.moveTo(from.x, from.y);
    ctx.quadraticCurveTo(control.x, control.y, to.x, to.y);
    ctx.stroke();
  }

  function addPoint(ctx: CanvasRenderingContext2D, p: Point) {
    const pts = stroke.current;
    const last = pts[pts.length - 1];
    if (last && Math.hypot(p.x - last.x, p.y - last.y) < 0.35) return;
    pts.push(p);
    if (pts.length === 1) {
      drawDot(ctx, p);
      return;
    }
    const width = nextWidth(p, last);
    if (pts.length === 2) {
      const start = mid(pts[0], pts[1]);
      drawCurve(ctx, pts[0], pts[0], start, width);
      return;
    }
    const a = pts[pts.length - 3];
    const b = pts[pts.length - 2];
    const c = pts[pts.length - 1];
    drawCurve(ctx, mid(a, b), b, mid(b, c), width);
  }

  function finishStroke(ctx: CanvasRenderingContext2D) {
    const pts = stroke.current;
    if (pts.length === 1) {
      drawDot(ctx, pts[0]);
      return;
    }
    if (pts.length >= 2) {
      const a = pts[pts.length - 2];
      const b = pts[pts.length - 1];
      drawCurve(ctx, mid(a, b), b, b, widthRef.current);
    }
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const ready = setupContext();
    if (!ready) return;
    drawing.current = true;
    widthRef.current = inkWidth().start;
    stroke.current = [];
    addPoint(
      ready.ctx,
      pointFrom(e.clientX, e.clientY, e.timeStamp, e.pressure, e.currentTarget),
    );
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = ctxRef.current;
    if (!ctx) return;
    const native = e.nativeEvent;
    const samples =
      typeof native.getCoalescedEvents === "function"
        ? native.getCoalescedEvents()
        : [native];
    for (const sample of samples) {
      addPoint(
        ctx,
        pointFrom(
          sample.clientX,
          sample.clientY,
          sample.timeStamp,
          sample.pressure,
          e.currentTarget,
        ),
      );
    }
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
    drawing.current = false;
    const ctx = ctxRef.current;
    if (ctx) finishStroke(ctx);
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

  const box = tall ? "h-44" : "h-8";
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
