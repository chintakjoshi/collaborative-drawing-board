import { useCallback, useRef } from 'react';
import { Point, Stroke, ToolType } from '../types/drawing';

interface StrokeMeta {
  layerId: string;
  brushType: ToolType;
  color: string;
  width: number;
}

interface UseDrawingHandlersArgs {
  userId: string;
  activeLayerId: string;
  currentTool: ToolType;
  currentColor: string;
  sendStrokeStart?: (stroke: Omit<Stroke, 'id' | 'createdAt'>) => string | null;
  sendStrokePoints?: (strokeId: string, points: Point[]) => void;
  sendStrokeEnd?: (strokeId: string) => void;
  sendErasePath?: (points: Point[]) => void;
  sendCursorUpdate?: (x: number, y: number, tool: string) => void;
  setStrokes: (value: Stroke[] | ((prev: Stroke[]) => Stroke[])) => void;
  setObjectCount: (value: number | ((prev: number) => number)) => void;
  setShowLimitWarning: (value: boolean) => void;
}

export const useDrawingHandlers = ({
  userId,
  activeLayerId,
  currentTool,
  currentColor,
  sendStrokeStart,
  sendStrokePoints,
  sendStrokeEnd,
  sendErasePath,
  sendCursorUpdate,
  setStrokes,
  setObjectCount,
  setShowLimitWarning
}: UseDrawingHandlersArgs) => {
  const currentStrokeId = useRef<string | null>(null);
  const currentEraserPoints = useRef<Point[]>([]);
  const currentStrokePoints = useRef<Point[]>([]);
  const currentStrokeMeta = useRef<StrokeMeta | null>(null);

  const getStrokeWidth = useCallback((tool: ToolType) => {
    switch (tool) {
      case 'pen': return 5;
      case 'marker': return 10;
      case 'highlighter': return 20;
      default: return 5;
    }
  }, []);

  const handleDrawStart = useCallback((point: Point) => {
    if (currentTool === 'eraser') {
      currentEraserPoints.current = [point];
      return;
    }

    currentStrokePoints.current = [point];
    currentStrokeMeta.current = {
      layerId: activeLayerId,
      brushType: currentTool,
      color: currentColor,
      width: getStrokeWidth(currentTool)
    };
    currentStrokeId.current = sendStrokeStart?.({
      userId,
      layerId: activeLayerId,
      brushType: currentTool,
      color: currentColor,
      width: getStrokeWidth(currentTool),
      points: [point]
    }) || null;
  }, [activeLayerId, currentColor, currentTool, getStrokeWidth, sendStrokeStart, userId]);

  const handleDrawMove = useCallback((points: Point[]) => {
    if (currentTool === 'eraser' && currentEraserPoints.current.length > 0) {
      currentEraserPoints.current = [...currentEraserPoints.current, ...points];
      sendErasePath?.(points);
      return;
    }

    if (currentStrokeId.current && points.length > 0) {
      currentStrokePoints.current = [...currentStrokePoints.current, ...points];
      sendStrokePoints?.(currentStrokeId.current, points);
      sendCursorUpdate?.(points[0].x, points[0].y, currentTool);
    }
  }, [currentTool, sendCursorUpdate, sendErasePath, sendStrokePoints]);

  const handleDrawEnd = useCallback(() => {
    if (currentTool === 'eraser') {
      currentEraserPoints.current = [];
      currentStrokePoints.current = [];
      currentStrokeMeta.current = null;
      currentStrokeId.current = null;
      return;
    }

    if (currentStrokeId.current) {
      sendStrokeEnd?.(currentStrokeId.current);

      const meta = currentStrokeMeta.current;
      const points = currentStrokePoints.current;
      const strokeId = currentStrokeId.current;

      if (meta && points.length > 0) {
        const localStroke: Stroke = {
          id: strokeId,
          userId,
          layerId: meta.layerId,
          brushType: meta.brushType,
          color: meta.color,
          width: meta.width,
          points: [...points],
          createdAt: Date.now()
        };

        let didAddStroke = false;
        setStrokes(prev => {
          const existingIndex = prev.findIndex(stroke => stroke.id === strokeId);
          if (existingIndex === -1) {
            didAddStroke = true;
            return [...prev, localStroke];
          }
          const existing = prev[existingIndex];
          if (existing.points.length < localStroke.points.length) {
            const next = [...prev];
            next[existingIndex] = { ...existing, points: localStroke.points };
            return next;
          }
          return prev;
        });

        if (didAddStroke) {
          setObjectCount(prev => {
            const next = prev + 1;
            if (next >= 4500) setShowLimitWarning(true);
            return next;
          });
        }
      }
    }

    currentStrokePoints.current = [];
    currentStrokeMeta.current = null;
    currentStrokeId.current = null;
  }, [currentTool, sendStrokeEnd, setObjectCount, setShowLimitWarning, setStrokes, userId]);

  return {
    handleDrawStart,
    handleDrawMove,
    handleDrawEnd
  };
};
