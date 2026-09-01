"use client";

import { useEffect, useRef, useState } from "react";
import { Redo2, Undo2, X } from "lucide-react";
import {
  exportCanvasSignature,
  normalizeSignature,
} from "@/lib/signature-image";
import { cn } from "@/lib/utils";

function fillPaper(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
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
  const last = useRef<{ x: number; y: number } | null>(null);
  const history = useRef<string[]>(value ? [value] : []);
  const index = useRef(value ? 0 : -1);
  const skipSync = useRef(false);
  const [canUndo, setCanUndo] = useState(Boolean(value));
  const [canRedo, setCanRedo] = useState(false);

  valueRef.current = value;

  function setFlags() {
    setCanUndo(index.current >= 0);
    setCanRedo(index.current < history.current.length - 1);
  }

  function setupContext() {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(1.25, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    const resized = canvas.width !== w || canvas.height !== h;
    if (resized) {
      canvas.width = w;
      canvas.height = h;
    }
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return null;
    if (resized) fillPaper(canvas, ctx);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineWidth = tall ? 2.6 : 1.8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111";
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
      paintStored();
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

  function point(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setupContext();
    drawing.current = true;
    last.current = point(e);
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = ctxRef.current;
    const p = point(e);
    const prev = last.current;
    if (ctx && prev) {
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    last.current = p;
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
    last.current = null;
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
    skipSync.current = true;
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
  }

  const box = tall ? "h-36" : "h-8";
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
