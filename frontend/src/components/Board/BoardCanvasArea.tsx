import React, { useEffect, useRef, useState } from 'react';
import { FiCircle, FiWifi, FiWifiOff } from 'react-icons/fi';
import { DrawingCanvas } from '../Canvas/DrawingCanvas';
import { Layer, Point, Stroke, ToolType, User } from '../../types/drawing';
import { Shape, TextObject } from '../../types/boardObjects';

interface BoardCanvasAreaProps {
  currentTool: ToolType;
  currentColor: string;
  layers: Layer[];
  activeLayerId: string;
  isConnected: boolean;
  strokes: Stroke[];
  shapes: Shape[];
  textObjects: TextObject[];
  onDrawStart: (point: Point) => void;
  onDrawMove: (points: Point[]) => void;
  onDrawEnd: () => void;
  onShapeStart: (point: Point) => void;
  onShapeUpdate: (start: Point, end: Point) => void;
  onShapeEnd: (shape: any) => void;
  onTextCreate: (text: string, point: Point) => void;
  onErase: (points: Point[]) => void;
  users: User[];
  currentUserId: string;
}

export const BoardCanvasArea: React.FC<BoardCanvasAreaProps> = ({
  currentTool,
  currentColor,
  layers,
  activeLayerId,
  isConnected,
  strokes,
  shapes,
  textObjects,
  onDrawStart,
  onDrawMove,
  onDrawEnd,
  onShapeStart,
  onShapeUpdate,
  onShapeEnd,
  onTextCreate,
  onErase,
  users,
  currentUserId
}) => {
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const resizeRafRef = useRef<number | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 1000, height: 700 });

  useEffect(() => {
    const element = canvasContainerRef.current;
    if (!element) return;

    const updateCanvasSize = () => {
      const nextWidth = Math.max(element.clientWidth - 24, 300);
      const nextHeight = Math.max(element.clientHeight - 24, 320);

      setCanvasSize((prev) => (
        prev.width === nextWidth && prev.height === nextHeight
          ? prev
          : { width: nextWidth, height: nextHeight }
      ));
    };

    updateCanvasSize();

    const resizeObserver = new ResizeObserver(() => {
      if (resizeRafRef.current !== null) return;

      resizeRafRef.current = window.requestAnimationFrame(() => {
        resizeRafRef.current = null;
        updateCanvasSize();
      });
    });

    resizeObserver.observe(element);

    return () => {
      if (resizeRafRef.current !== null) {
        window.cancelAnimationFrame(resizeRafRef.current);
      }
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <section className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
      <div className="px-4 py-3 border-b border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="inline-flex items-center px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200">
              <div className="w-5 h-5 rounded-full mr-2 border border-slate-300" style={{ backgroundColor: currentColor }} />
              <div className="font-semibold text-slate-900 capitalize">{currentTool}</div>
            </div>
            <div className="text-sm text-slate-600 bg-cyan-50 border border-cyan-200 px-3 py-1.5 rounded-xl">
              Layer <span className="font-semibold text-cyan-900">{layers.find(l => l.id === activeLayerId)?.name || 'Default'}</span>
            </div>
          </div>

          <div className="flex items-center">
            <div className={`text-sm px-3 py-1.5 rounded-xl border inline-flex items-center font-medium ${isConnected ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
              {isConnected ? <FiWifi className="mr-1.5" /> : <FiWifiOff className="mr-1.5" />}
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>
          </div>
        </div>
      </div>

      <div ref={canvasContainerRef} className="flex-1 relative overflow-hidden p-3 bg-slate-50">
        <div className="relative z-10 h-full w-full">
          <DrawingCanvas
            width={canvasSize.width}
            height={canvasSize.height}
            strokes={strokes}
            shapes={shapes}
            textObjects={textObjects}
            onDrawStart={onDrawStart}
            onDrawMove={onDrawMove}
            onDrawEnd={onDrawEnd}
            onShapeStart={onShapeStart}
            onShapeUpdate={onShapeUpdate}
            onShapeEnd={onShapeEnd}
            onTextCreate={onTextCreate}
            onErase={onErase}
            currentTool={currentTool}
            currentColor={currentColor}
          />
        </div>

        <div className="absolute top-0 left-0 pointer-events-none">
          {users
            .filter(user => user.id !== currentUserId)
            .map(user => (
              <div
                key={user.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2"
                style={{ left: user.cursorX, top: user.cursorY }}
              >
                <div className="flex flex-col items-center">
                  <div
                    className="w-3.5 h-3.5 rounded-full border border-white shadow-[0_3px_8px_rgba(15,23,42,0.35)]"
                    style={{ backgroundColor: user.color }}
                  />
                  <div className="mt-1 px-2 py-1 bg-slate-900/90 text-white text-[11px] rounded-md whitespace-nowrap inline-flex items-center">
                    <FiCircle className="mr-1 text-[8px]" style={{ color: user.color }} />
                    {user.nickname}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </section>
  );
};
