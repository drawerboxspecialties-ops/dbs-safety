"use client";

import { useEffect, useRef } from "react";

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

  valueRef.current = value;

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
    ctx.lineWidth = 2.4;
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
    if (canvas) onChange(canvas.toDataURL("image/png"));
  }

  function clear(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onChange("");
  }

  return (
    <div className="relative h-16 w-full min-w-[10rem]">
      <canvas
        ref={canvasRef}
        className="h-16 w-full cursor-crosshair touch-none print:hidden"
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
          className="hidden h-16 w-full object-contain object-left print:block"
        />
      ) : (
        <div className="pointer-events-none absolute inset-x-1 bottom-2 hidden border-b border-black print:block" />
      )}
      {value ? (
        <button
          type="button"
          onClick={clear}
          className="absolute top-0 right-0 px-1 text-[10px] text-neutral-600 underline print:hidden"
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}
