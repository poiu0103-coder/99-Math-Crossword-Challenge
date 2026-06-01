import React, { useRef, useState, useEffect } from "react";
import { Trash2, Edit2, Download, RefreshCw, PenTool } from "lucide-react";

interface DrawingPadProps {
  isOpen: boolean;
}

export default function DrawingPad({ isOpen }: DrawingPadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#475569"); // Slate default
  const [lineWidth, setLineWidth] = useState(3);
  const [isEraser, setIsEraser] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Sizing the canvas matching container
    const rect = canvas.parentElement?.getBoundingClientRect();
    canvas.width = (rect?.width || 400) - 24;
    canvas.height = 200;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }
  }, [isOpen]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = isEraser ? "#ffffff" : color;
    ctx.lineWidth = isEraser ? 15 : lineWidth;
    
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      if (e.touches.length === 0) return;
      // Prevent scrolling while drawing on mobile
      if (e.cancelable) e.preventDefault();
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  if (!isOpen) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-md mt-4 transition-all duration-300">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-1">
          <PenTool className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-semibold text-slate-700 font-display">가상 연습장 (자유 드로잉)</span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Colors */}
          <div className="flex items-center space-x-1 mr-2">
            {[
              { label: "slate-600", hex: "#475569" },
              { label: "red-500", hex: "#ef4444" },
              { label: "emerald-600", hex: "#059669" },
              { label: "indigo-600", hex: "#4f46e5" }
            ].map((c) => (
              <button
                key={c.hex}
                onClick={() => {
                  setColor(c.hex);
                  setIsEraser(false);
                }}
                className={`w-4 h-4 rounded-full border transition-transform ${c.hex === color && !isEraser ? "ring-2 ring-slate-400 scale-110" : "scale-90"}`}
                style={{ backgroundColor: c.hex }}
                title={`${c.label} 색상`}
              />
            ))}
          </div>

          {/* Eraser Toggle */}
          <button
            onClick={() => setIsEraser(!isEraser)}
            className={`p-1.5 rounded text-xs flex items-center space-x-0.5 ${isEraser ? "bg-amber-100 text-amber-800 border border-amber-300" : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200"}`}
            title="지우개 토글"
          >
            <span className="text-[10px]">지우개</span>
          </button>

          {/* Clean */}
          <button
            onClick={clearCanvas}
            className="p-1.5 hover:bg-rose-50 text-rose-600 border border-rose-100 rounded text-xs flex items-center space-x-1"
            title="연습장 비우기"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="text-[10px]">지우기</span>
          </button>
        </div>
      </div>

      <div className="relative border border-slate-100 rounded-lg bg-teal-50/20 overflow-hidden" style={{ minHeight: "200px" }}>
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-[200px] cursor-crosshair"
          style={{ touchAction: "none" }}
        />
        <div className="absolute bottom-1 right-2 pointer-events-none text-[9px] text-slate-400 font-mono">
          마우스나 손가락으로 손글씨 연산을 해보세요!
        </div>
      </div>
    </div>
  );
}
