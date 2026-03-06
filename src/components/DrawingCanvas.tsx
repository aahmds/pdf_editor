import React, { useRef, useEffect, useCallback } from 'react';

interface DrawingCanvasProps {
  width: number;
  height: number;
  scale: number;
  strokeColor: string;
  strokeWidth: number;
  isActive: boolean;
  onDrawingComplete: (dataUrl: string) => void;
}

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  width,
  height,
  scale,
  strokeColor,
  strokeWidth,
  isActive,
  onDrawingComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  const getContext = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext('2d');
  }, []);

  const getCanvasCoords = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: (clientX - rect.left) / scale,
        y: (clientY - rect.top) / scale,
      };
    },
    [scale]
  );

  const startDrawing = useCallback(
    (clientX: number, clientY: number) => {
      if (!isActive) return;
      const ctx = getContext();
      if (!ctx) return;
      isDrawing.current = true;
      const { x, y } = getCanvasCoords(clientX, clientY);
      ctx.save();
      ctx.scale(scale, scale);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.restore();
      ctx.beginPath();
      ctx.moveTo(x * scale, y * scale);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    },
    [isActive, getContext, getCanvasCoords, scale, strokeColor, strokeWidth]
  );

  const draw = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDrawing.current || !isActive) return;
      const ctx = getContext();
      if (!ctx) return;
      const { x, y } = getCanvasCoords(clientX, clientY);
      ctx.lineTo(x * scale, y * scale);
      ctx.stroke();
    },
    [isActive, getContext, getCanvasCoords, scale]
  );

  const stopDrawing = useCallback(() => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onDrawingComplete(dataUrl);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [onDrawingComplete]);

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      startDrawing(e.clientX, e.clientY);
    },
    [startDrawing]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      draw(e.clientX, e.clientY);
    },
    [draw]
  );

  const handleMouseUp = useCallback(() => {
    stopDrawing();
  }, [stopDrawing]);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (touch) {
        startDrawing(touch.clientX, touch.clientY);
      }
    },
    [startDrawing]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (touch) {
        draw(touch.clientX, touch.clientY);
      }
    },
    [draw]
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      e.preventDefault();
      stopDrawing();
    },
    [stopDrawing]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseUp);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  ]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: isActive ? 'auto' : 'none',
        cursor: isActive ? 'crosshair' : 'default',
        touchAction: 'none',
      }}
    />
  );
};

export default DrawingCanvas;
