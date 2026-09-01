"use client";

import { useEffect, useRef, useState } from "react";
import { Redo2, Undo2, X } from "lucide-react";

export function SignaturePad({
  value,
  onChange,
}: {
  value: string;
  onChange: (dataUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
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
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineWidth = 1.8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111";
    return { ctx, rect };
  }

  function paintStored() {
    const ready = setupContext();
    if (!ready) return;
    const { ctx, rect } = ready;
    ctx.clearRect(0, 0, rect.width, rect.height);
    if (!valueRef.current) return;
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, rect.width, rect.height);
    };
    img.src = valueRef.current;
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
    drawing.current = true;
    last.current = point(e);
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ready = setupContext();
    const p = point(e);
    const prev = last.current;
    if (ready && prev) {
      ready.ctx.beginPath();
      ready.ctx.moveTo(prev.x, prev.y);
      ready.ctx.lineTo(p.x, p.y);
      ready.ctx.stroke();
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
    if (canvas) commit(canvas.toDataURL("image/png"));
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

  return (
    <div className="flex items-center gap-0.5">
      <div className="relative h-8 min-w-0 flex-1">
        <canvas
          ref={canvasRef}
          className="h-8 w-full cursor-crosshair touch-none print:hidden"
          style={{ touchAction: "none" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt=""
            className="hidden h-8 w-full object-contain object-left print:block"
          />
        ) : (
          <div className="pointer-events-none absolute inset-x-1 bottom-1 hidden border-b border-black print:block" />
        )}
      </div>
      <div className="flex shrink-0 print:hidden">
        <button
          type="button"
          title="Undo"
          aria-label="Undo signature"
          disabled={!canUndo}
          onClick={undo}
          className="rounded p-0.5 text-neutral-700 disabled:opacity-30"
        >
          <Undo2 className="size-3.5" />
        </button>
        <button
          type="button"
          title="Redo"
          aria-label="Redo signature"
          disabled={!canRedo}
          onClick={redo}
          className="rounded p-0.5 text-neutral-700 disabled:opacity-30"
        >
          <Redo2 className="size-3.5" />
        </button>
        <button
          type="button"
          title="Clear"
          aria-label="Clear signature"
          disabled={!canUndo}
          onClick={clear}
          className="rounded p-0.5 text-neutral-700 disabled:opacity-30"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
