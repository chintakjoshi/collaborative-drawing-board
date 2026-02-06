import { useEffect, useRef, useCallback, useState } from 'react';
import { Point, Stroke } from '../types/drawing';

interface WebSocketMessage {
    type: string;
    [key: string]: any;
}

interface Action {
    id: string;
    type: string;
    data: any;
    timestamp: number;
}

export const useDrawingWebSocket = (
    boardId: string | null,
    userId: string,
    onMessage: (message: WebSocketMessage) => void,
    userToken?: string | null
) => {
    const wsRef = useRef<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [undoStack, setUndoStack] = useState<Action[]>([]);
    const [redoStack, setRedoStack] = useState<Action[]>([]);
    const pointBufferRef = useRef<Record<string, Point[]>>({});
    const pointFlushTimerRef = useRef<number | null>(null);
    const cursorTimerRef = useRef<number | null>(null);
    const lastCursorSentAtRef = useRef<number>(0);
    const pendingCursorRef = useRef<{ x: number; y: number; tool: string } | null>(null);

    const POINT_FLUSH_MS = 33;
    const CURSOR_THROTTLE_MS = 50;
    const MAX_BUFFERED_AMOUNT = 256 * 1024;

    const canSend = () => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) return false;
        if (ws.bufferedAmount > MAX_BUFFERED_AMOUNT) return false;
        return true;
    };

    const sendJson = (message: any) => {
        if (!canSend()) return false;
        try {
            wsRef.current!.send(JSON.stringify(message));
            return true;
        } catch {
            return false;
        }
    };

    const clearTimers = () => {
        if (pointFlushTimerRef.current) {
            window.clearTimeout(pointFlushTimerRef.current);
            pointFlushTimerRef.current = null;
        }
        if (cursorTimerRef.current) {
            window.clearTimeout(cursorTimerRef.current);
            cursorTimerRef.current = null;
        }
    };

    const connect = useCallback((isCreating: boolean = false) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname;
        const port = '8000'; // Backend port
        // Use different endpoints for create vs join
        let wsUrl: string;
        if (isCreating) {
            wsUrl = `${protocol}//${host}:${port}/ws/create`;
        } else if (boardId) {
            const tokenParam = userToken ? `?token=${encodeURIComponent(userToken)}` : '';
            wsUrl = `${protocol}//${host}:${port}/ws/join/${boardId}${tokenParam}`;
        } else {
            console.error('Cannot connect: no board ID and not creating');
            return;
        }

        console.log('Connecting to:', wsUrl);
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('WebSocket connected successfully');
            setIsConnected(true);
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('WebSocket message received:', data.type);

                // Track actions for undo/redo
                if (data.type === 'stroke_start' && data.user_id === userId) {
                    setUndoStack(prev => [...prev, {
                        id: data.stroke_id,
                        type: 'stroke',
                        data: data,
                        timestamp: data.timestamp
                    }]);
                    setRedoStack([]); // Clear redo stack on new action
                }

                onMessage(data);
            } catch (error) {
                console.error('Failed to parse WebSocket message:', error);
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            setIsConnected(false);
            clearTimers();
        };

        ws.onclose = (event) => {
            console.log('WebSocket disconnected', event.code, event.reason);
            setIsConnected(false);
            clearTimers();
        };
    }, [boardId, onMessage, userId, userToken]);

    const flushStrokePoints = useCallback(() => {
        const scheduleFlush = () => {
            if (pointFlushTimerRef.current) return;
            pointFlushTimerRef.current = window.setTimeout(flushStrokePoints, POINT_FLUSH_MS);
        };

        pointFlushTimerRef.current = null;
        if (!canSend()) {
            scheduleFlush();
            return;
        }

        const buffer = pointBufferRef.current;
        Object.keys(buffer).forEach((strokeId) => {
            const points = buffer[strokeId];
            if (!points || points.length === 0) return;
            buffer[strokeId] = [];

            const message = {
                type: 'stroke_points',
                user_id: userId,
                stroke_id: strokeId,
                points: points.map(p => ({
                    x: p.x,
                    y: p.y,
                    pressure: p.pressure,
                    timestamp: p.timestamp
                }))
            };
            if (!sendJson(message)) {
                buffer[strokeId] = [...points, ...(buffer[strokeId] || [])];
                scheduleFlush();
            }
        });
    }, [userId]);

    const sendStrokeStart = useCallback((stroke: Omit<Stroke, 'id' | 'createdAt'>) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            const strokeId = `stroke_${Date.now()}_${userId}`;
            const message = {
                type: 'stroke_start',
                stroke_id: strokeId,
                stroke: {
                    layer_id: stroke.layerId,
                    brush_type: stroke.brushType,
                    color: stroke.color,
                    width: stroke.width,
                    user_id: userId,
                }
            };
            sendJson(message);
            return strokeId;
        }
        return null;
    }, [userId]);

    const sendStrokePoints = useCallback((strokeId: string, points: Point[]) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        if (!pointBufferRef.current[strokeId]) {
            pointBufferRef.current[strokeId] = [];
        }
        pointBufferRef.current[strokeId].push(...points);
        if (!pointFlushTimerRef.current) {
            pointFlushTimerRef.current = window.setTimeout(flushStrokePoints, POINT_FLUSH_MS);
        }
    }, [flushStrokePoints]);

    const sendStrokeEnd = useCallback((strokeId: string) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            // Flush remaining points for this stroke first
            if (pointBufferRef.current[strokeId]?.length) {
                const points = pointBufferRef.current[strokeId];
                pointBufferRef.current[strokeId] = [];
                const pointsMessage = {
                    type: 'stroke_points',
                    user_id: userId,
                    stroke_id: strokeId,
                    points: points.map(p => ({
                        x: p.x,
                        y: p.y,
                        pressure: p.pressure,
                        timestamp: p.timestamp
                    }))
                };
                sendJson(pointsMessage);
            }
            const message = {
                type: 'stroke_end',
                user_id: userId,
                stroke_id: strokeId
            };
            sendJson(message);
        }
    }, [userId]);

    const sendShapeCreate = useCallback((shape: any) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            const message = {
                type: 'shape_create',
                user_id: userId,
                shape: shape
            };
            sendJson(message);

            // Track for undo
            setUndoStack(prev => [...prev, {
                id: `shape_${Date.now()}_${userId}`,
                type: 'shape',
                data: message,
                timestamp: Date.now()
            }]);
            setRedoStack([]);
        }
    }, [userId]);

    const sendTextCreate = useCallback((text: string, point: Point, layerId: string) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            const message = {
                type: 'text_create',
                user_id: userId,
                text: {
                    text,
                    x: point.x,
                    y: point.y,
                    color: '#000000',
                    layer_id: layerId,
                    font_size: 16,
                    font_family: 'Arial'
                }
            };
            sendJson(message);

            // Track for undo
            setUndoStack(prev => [...prev, {
                id: `text_${Date.now()}_${userId}`,
                type: 'text',
                data: message,
                timestamp: Date.now()
            }]);
            setRedoStack([]);
        }
    }, [userId]);

    const sendErasePath = useCallback((points: Point[]) => {
        if (wsRef.current?.readyState === WebSocket.OPEN && points.length > 0) {
            const message = {
                type: 'erase_path',
                user_id: userId,
                points: points.map(p => ({
                    x: p.x,
                    y: p.y,
                    timestamp: p.timestamp
                }))
            };
            sendJson(message);
        }
    }, [userId]);

    const sendUndo = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN && undoStack.length > 0) {
            const lastAction = undoStack[undoStack.length - 1];
            const message = {
                type: 'undo',
                user_id: userId,
                action_id: lastAction.id,
                action_type: lastAction.type
            };
            sendJson(message);

            // Move to redo stack
            setRedoStack(prev => [...prev, lastAction]);
            setUndoStack(prev => prev.slice(0, -1));
        }
    }, [undoStack, userId]);

    const sendRedo = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN && redoStack.length > 0) {
            const lastRedoAction = redoStack[redoStack.length - 1];
            // Resend the original action
            sendJson(lastRedoAction.data);

            // Move back to undo stack
            setUndoStack(prev => [...prev, lastRedoAction]);
            setRedoStack(prev => prev.slice(0, -1));
        }
    }, [redoStack]);

    const sendCursorUpdate = useCallback((x: number, y: number, tool: string) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        pendingCursorRef.current = { x, y, tool };
        const now = Date.now();
        const elapsed = now - lastCursorSentAtRef.current;

        const sendNow = () => {
            const pending = pendingCursorRef.current;
            if (!pending) return;
            pendingCursorRef.current = null;
            lastCursorSentAtRef.current = Date.now();
            sendJson({
                type: 'cursor_update',
                user_id: userId,
                x: pending.x,
                y: pending.y,
                tool: pending.tool
            });
        };

        if (elapsed >= CURSOR_THROTTLE_MS) {
            if (cursorTimerRef.current) {
                window.clearTimeout(cursorTimerRef.current);
                cursorTimerRef.current = null;
            }
            sendNow();
            return;
        }

        if (!cursorTimerRef.current) {
            cursorTimerRef.current = window.setTimeout(() => {
                cursorTimerRef.current = null;
                sendNow();
            }, CURSOR_THROTTLE_MS - elapsed);
        }
    }, [userId]);

    const disconnect = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        setIsConnected(false);
        clearTimers();
    }, []);

    useEffect(() => {
        return () => {
            disconnect();
        };
    }, [disconnect]);

    return {
        connect,
        disconnect,
        sendStrokeStart,
        sendStrokePoints,
        sendStrokeEnd,
        sendShapeCreate,
        sendTextCreate,
        sendErasePath,
        sendCursorUpdate,
        sendUndo,
        sendRedo,
        isConnected,
        canUndo: undoStack.length > 0,
        canRedo: redoStack.length > 0
    };
};
