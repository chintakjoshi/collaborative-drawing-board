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

export const useEnhancedDrawingWebSocket = (
    boardId: string | null,
    userId: string,
    onMessage: (message: WebSocketMessage) => void
) => {
    const wsRef = useRef<WebSocket | null>(null);
    const [undoStack, setUndoStack] = useState<Action[]>([]);
    const [redoStack, setRedoStack] = useState<Action[]>([]);

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
            wsUrl = `${protocol}//${host}:${port}/ws/join/${boardId}`;
        } else {
            console.error('Cannot connect: no board ID and not creating');
            return;
        }

        console.log('Connecting to:', wsUrl);
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('WebSocket connected successfully');
            // For the new endpoint structure, we don't need to send initial action
            // The endpoint itself determines the action
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
        };

        ws.onclose = (event) => {
            console.log('WebSocket disconnected', event.code, event.reason);
        };
    }, [boardId, onMessage, userId]);

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
            wsRef.current.send(JSON.stringify(message));
            return strokeId;
        }
        return null;
    }, [userId]);

    const sendStrokePoints = useCallback((strokeId: string, points: Point[]) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
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
            wsRef.current.send(JSON.stringify(message));
        }
    }, [userId]);

    const sendStrokeEnd = useCallback((strokeId: string) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            const message = {
                type: 'stroke_end',
                user_id: userId,
                stroke_id: strokeId
            };
            wsRef.current.send(JSON.stringify(message));
        }
    }, [userId]);

    const sendShapeCreate = useCallback((shape: any) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            const message = {
                type: 'shape_create',
                user_id: userId,
                shape: shape
            };
            wsRef.current.send(JSON.stringify(message));

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
            wsRef.current.send(JSON.stringify(message));

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
            wsRef.current.send(JSON.stringify(message));
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
            wsRef.current.send(JSON.stringify(message));

            // Move to redo stack
            setRedoStack(prev => [...prev, lastAction]);
            setUndoStack(prev => prev.slice(0, -1));
        }
    }, [undoStack, userId]);

    const sendRedo = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN && redoStack.length > 0) {
            const lastRedoAction = redoStack[redoStack.length - 1];
            // Resend the original action
            wsRef.current.send(JSON.stringify(lastRedoAction.data));

            // Move back to undo stack
            setUndoStack(prev => [...prev, lastRedoAction]);
            setRedoStack(prev => prev.slice(0, -1));
        }
    }, [redoStack]);

    const sendCursorUpdate = useCallback((x: number, y: number, tool: string) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            const message = {
                type: 'cursor_update',
                user_id: userId,
                x,
                y,
                tool
            };
            wsRef.current.send(JSON.stringify(message));
        }
    }, [userId]);

    const disconnect = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
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
        isConnected: wsRef.current?.readyState === WebSocket.OPEN,
        canUndo: undoStack.length > 0,
        canRedo: redoStack.length > 0
    };
};