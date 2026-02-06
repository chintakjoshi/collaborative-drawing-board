import { useCallback, MutableRefObject } from 'react';
import { Shape, TextObject } from '../types/boardObjects';
import { Stroke, User } from '../types/drawing';

interface UseBoardWebSocketHandlerArgs {
  users: User[];
  setUsers: (value: User[] | ((prev: User[]) => User[])) => void;
  setStrokes: (value: Stroke[] | ((prev: Stroke[]) => Stroke[])) => void;
  setShapes: (value: Shape[] | ((prev: Shape[]) => Shape[])) => void;
  setTextObjects: (value: TextObject[] | ((prev: TextObject[]) => TextObject[])) => void;
  setUserId: (value: string) => void;
  setBoardId: (value: string | null) => void;
  setUserToken: (value: string | null) => void;
  setIsAdmin: (value: boolean) => void;
  setObjectCount: (value: number | ((prev: number) => number)) => void;
  setAdminDisconnectTimer: (value: number | null) => void;
  setShowLimitWarning: (value: boolean) => void;
  setIsConnecting: (value: boolean) => void;
  setConnectionError: (value: string) => void;
  hasReceivedWelcomeRef: MutableRefObject<boolean>;
  handleCompleteDisconnect: () => void;
}

export const useBoardWebSocketHandler = ({
  users,
  setUsers,
  setStrokes,
  setShapes,
  setTextObjects,
  setUserId,
  setBoardId,
  setUserToken,
  setIsAdmin,
  setObjectCount,
  setAdminDisconnectTimer,
  setShowLimitWarning,
  setIsConnecting,
  setConnectionError,
  hasReceivedWelcomeRef,
  handleCompleteDisconnect
}: UseBoardWebSocketHandlerArgs) => {
  return useCallback((message: any) => {
    switch (message.type) {
      case 'welcome': {
        console.log('Welcome message received:', message);
        hasReceivedWelcomeRef.current = true;
        setIsConnecting(false);
        setConnectionError('');

        const receivedUserId = message.user_id;
        const receivedBoardId = message.board_id;
        const receivedToken = message.token;
        const receivedRole = message.role;

        setUserId(receivedUserId);
        setBoardId(receivedBoardId);
        setUserToken(receivedToken);
        setIsAdmin(receivedRole === 'admin');

        localStorage.setItem('boardId', receivedBoardId);
        localStorage.setItem('userId', receivedUserId);
        localStorage.setItem('userToken', receivedToken);
        localStorage.setItem('isAdmin', receivedRole === 'admin' ? 'true' : 'false');

        if (message.board_state) {
          const boardState = message.board_state;

          setUsers((boardState.users || []).map((u: any) => ({
            id: u.id,
            nickname: u.nickname,
            role: u.role,
            cursorX: u.cursor_x ?? 0,
            cursorY: u.cursor_y ?? 0,
            activeTool: u.active_tool ?? 'pen',
            color: u.color ?? '#000000'
          })));

          setObjectCount(boardState.object_count || 0);

          if (boardState.strokes && Array.isArray(boardState.strokes)) {
            const initialStrokes: Stroke[] = boardState.strokes.map((s: any) => ({
              id: s.id,
              userId: s.user_id,
              layerId: s.layer_id,
              brushType: s.brush_type,
              color: s.color,
              width: s.width,
              points: s.points.map((p: any) => ({
                x: p.x,
                y: p.y,
                pressure: p.pressure || 0.5,
                timestamp: p.timestamp || 0
              })),
              createdAt: s.created_at
            }));
            setStrokes(initialStrokes);
          }

          if (boardState.shapes && Array.isArray(boardState.shapes)) {
            const initialShapes: Shape[] = boardState.shapes.map((s: any) => ({
              id: s.id,
              type: s.type,
              start_x: s.start_x,
              start_y: s.start_y,
              end_x: s.end_x,
              end_y: s.end_y,
              color: s.color,
              stroke_width: s.stroke_width,
              layer_id: s.layer_id,
              user_id: s.user_id
            }));
            setShapes(initialShapes);
          }

          if (boardState.texts && Array.isArray(boardState.texts)) {
            const initialTexts: TextObject[] = boardState.texts.map((t: any) => ({
              id: t.id,
              text: t.text,
              x: t.x,
              y: t.y,
              color: t.color,
              layer_id: t.layer_id,
              user_id: t.user_id,
              font_size: t.font_size || 16,
              font_family: t.font_family || 'Arial'
            }));
            setTextObjects(initialTexts);
          }

          if (receivedRole === 'user' && !boardState.admin_online) {
            const disconnectTime = boardState.admin_disconnected_at;
            if (disconnectTime) {
              const timeLeft = Math.max(0, 600 - (Date.now() / 1000 - disconnectTime));
              setAdminDisconnectTimer(Math.floor(timeLeft));
            }
          }
        }
        break;
      }
      case 'error':
        console.error('WebSocket error:', message.message);
        setIsConnecting(false);
        hasReceivedWelcomeRef.current = false;

        if (message.message.includes('not found') || message.message.includes('full')) {
          setConnectionError(message.message);
          handleCompleteDisconnect();
        } else if (message.message.includes('Object limit')) {
          setShowLimitWarning(true);
        }
        break;

      case 'rate_limit_warning':
        console.warn('Rate limit warning:', message.message);
        break;

      case 'user_joined':
        setUsers(prev => {
          const userExists = prev.find(u => u.id === message.user_id);
          if (userExists) return prev;

          return [...prev, {
            id: message.user_id,
            nickname: message.nickname,
            role: 'user',
            cursorX: 0,
            cursorY: 0,
            activeTool: 'pen',
            color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`
          }];
        });
        break;

      case 'user_left': {
        setUsers(prev => prev.filter(u => u.id !== message.user_id));

        const wasAdmin = users.find(u => u.id === message.user_id)?.role === 'admin';
        if (wasAdmin) {
          setAdminDisconnectTimer(600);
        }
        break;
      }
      case 'stroke_start': {
        const newStroke: Stroke = {
          id: message.stroke_id,
          userId: message.user_id,
          layerId: message.stroke.layer_id,
          brushType: message.stroke.brush_type,
          color: message.stroke.color,
          width: message.stroke.width,
          points: [],
          createdAt: message.timestamp
        };
        let didAddStroke = false;
        setStrokes(prev => {
          if (prev.some(stroke => stroke.id === newStroke.id)) {
            return prev;
          }
          didAddStroke = true;
          return [...prev, newStroke];
        });
        if (didAddStroke) {
          setObjectCount(prev => {
            const next = prev + 1;
            if (next >= 4500) setShowLimitWarning(true);
            return next;
          });
        }
        break;
      }
      case 'stroke_points':
        setStrokes(prev => prev.map(stroke => {
          if (stroke.id === message.stroke_id) {
            const newPoints = message.points.map((p: any) => ({
              x: p.x,
              y: p.y,
              pressure: p.pressure || 0.5,
              timestamp: p.timestamp
            }));
            return {
              ...stroke,
              points: [...stroke.points, ...newPoints]
            };
          }
          return stroke;
        }));
        break;

      case 'shape_create': {
        const newShape: Shape = {
          id: message.shape_id,
          type: message.shape.type,
          start_x: message.shape.start_x,
          start_y: message.shape.start_y,
          end_x: message.shape.end_x,
          end_y: message.shape.end_y,
          color: message.shape.color,
          stroke_width: message.shape.stroke_width,
          layer_id: message.shape.layer_id,
          user_id: message.user_id
        };
        setShapes(prev => [...prev, newShape]);
        setObjectCount(prev => prev + 1);
        break;
      }
      case 'text_create': {
        const newText: TextObject = {
          id: message.text_id,
          text: message.text.text,
          x: message.text.x,
          y: message.text.y,
          color: message.text.color,
          layer_id: message.text.layer_id,
          user_id: message.user_id,
          font_size: message.text.font_size || 16,
          font_family: message.text.font_family || 'Arial'
        };
        setTextObjects(prev => [...prev, newText]);
        setObjectCount(prev => prev + 1);
        break;
      }
      case 'object_delete':
        if (message.object_type === 'stroke' || !message.object_type) {
          setStrokes(prev => prev.filter(stroke => stroke.id !== message.object_id));
        }
        setShapes(prev => prev.filter(shape => shape.id !== message.object_id));
        setTextObjects(prev => prev.filter(text => text.id !== message.object_id));
        setObjectCount(prev => Math.max(0, prev - 1));
        break;

      case 'cursor_update':
        setUsers(prev => prev.map(user => {
          if (user.id === message.user_id) {
            return {
              ...user,
              cursorX: message.x,
              cursorY: message.y,
              activeTool: message.tool
            };
          }
          return user;
        }));
        break;

      case 'session_ended':
        alert('Session has been ended by the admin.');
        handleCompleteDisconnect();
        break;

      case 'kicked':
        alert('You have been kicked from the session.');
        handleCompleteDisconnect();
        break;

      case 'admin_disconnect_countdown':
        console.log('Admin disconnect countdown:', message.seconds_remaining);
        setAdminDisconnectTimer(message.seconds_remaining);
        break;

      case 'admin_reconnected':
        console.log('Admin reconnected, clearing timer');
        setAdminDisconnectTimer(null);
        break;
    }
  }, [
    handleCompleteDisconnect,
    hasReceivedWelcomeRef,
    setAdminDisconnectTimer,
    setBoardId,
    setConnectionError,
    setIsAdmin,
    setIsConnecting,
    setObjectCount,
    setShapes,
    setShowLimitWarning,
    setStrokes,
    setTextObjects,
    setUserId,
    setUserToken,
    setUsers,
    users
  ]);
};
