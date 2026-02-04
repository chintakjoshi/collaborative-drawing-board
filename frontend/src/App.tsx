import React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { EnhancedDrawingCanvas } from './components/Canvas/EnhancedDrawingCanvas';
import { Toolbar } from './components/Toolbar/Toolbar';
import { UserList } from './components/Board/UserList';
import { AdminPanel } from './components/Admin/AdminPanel';
import { useEnhancedDrawingWebSocket } from './hooks/useEnhancedDrawingWebSocket';
import { useLayers } from './hooks/useLayers';
import { Stroke, Point, User, ToolType } from './types/drawing';
import { FiSettings, FiUsers, FiLayers, FiAlertCircle } from 'react-icons/fi';

interface Shape {
  id: string;
  type: string;
  start_x: number;
  start_y: number;
  end_x: number;
  end_y: number;
  color: string;
  stroke_width: number;
  layer_id: string;
  user_id: string;
}

interface TextObject {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  layer_id: string;
  user_id: string;
  font_size: number;
  font_family: string;
}

function App() {
  // Board state
  const [boardId, setBoardId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [userToken, setUserToken] = useState<string>('');
  const [joinCode, setJoinCode] = useState('');
  const [connectionError, setConnectionError] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);

  // Drawing state
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [textObjects, setTextObjects] = useState<TextObject[]>([]);
  const [currentTool, setCurrentTool] = useState<ToolType>('pen');
  const [currentColor, setCurrentColor] = useState('#000000');

  // User state
  const [users, setUsers] = useState<User[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState<'tools' | 'users' | 'layers' | 'admin'>('tools');
  const [showLimitWarning, setShowLimitWarning] = useState(false);
  const [objectCount, setObjectCount] = useState(0);
  const [adminDisconnectTimer, setAdminDisconnectTimer] = useState<number | null>(null);

  // Refs for drawing
  const currentStrokeId = useRef<string | null>(null);
  const currentEraserPoints = useRef<Point[]>([]);
  const hasReceivedWelcome = useRef(false);

  // Custom hooks
  const { layers, activeLayerId, setActiveLayerId, addLayer, toggleLayerVisibility, renameLayer, reorderLayers } = useLayers();
  const {
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
    canUndo,
    canRedo
  } = useEnhancedDrawingWebSocket(boardId, userId, handleWebSocketMessage);

  // Load session from localStorage on mount
  useEffect(() => {
    const savedBoardId = localStorage.getItem('boardId');
    const savedUserId = localStorage.getItem('userId');
    const savedToken = localStorage.getItem('userToken');
    const savedIsAdmin = localStorage.getItem('isAdmin') === 'true';

    if (savedBoardId && savedUserId && savedToken) {
      console.log('Restoring session:', { savedBoardId, savedUserId, savedIsAdmin });
      setBoardId(savedBoardId);
      setUserId(savedUserId);
      setUserToken(savedToken);
      setIsAdmin(savedIsAdmin);
      setIsConnecting(true);
      // Connect will be triggered by useEffect below
    }
  }, []);

  // Auto-connect when boardId is set (from localStorage or new connection)
  useEffect(() => {
    if (boardId && !isConnected && isConnecting) {
      const isCreating = localStorage.getItem('isCreating') === 'true';
      console.log('Auto-connecting to board:', boardId, 'isCreating:', isCreating);
      connect(isCreating);
      localStorage.removeItem('isCreating'); // Clear flag after use
    }
  }, [boardId, isConnected, isConnecting, connect]);

  // Handle WebSocket messages
  function handleWebSocketMessage(message: any) {
    switch (message.type) {
      case 'welcome':
        console.log('Welcome message received:', message);
        hasReceivedWelcome.current = true;
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

        // Save to localStorage for persistence
        localStorage.setItem('boardId', receivedBoardId);
        localStorage.setItem('userId', receivedUserId);
        localStorage.setItem('userToken', receivedToken);
        localStorage.setItem('isAdmin', receivedRole === 'admin' ? 'true' : 'false');

        // Initialize from board state
        if (message.board_state) {
          const boardState = message.board_state;

          // Set users
          setUsers(boardState.users || []);

          // Set object count
          setObjectCount(boardState.object_count || 0);

          // Initialize strokes from board state
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

          // Initialize shapes from board state
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

          // Initialize texts from board state
          if (boardState.texts && Array.isArray(boardState.texts)) {
            const initialTexts: TextObject[] = boardState.texts.map((t: any) => ({
              id: t.id,
              text: t.text,
              x: t.x,
              y: t.y,
              color: t.color,
              layer_id: t.layer_id,
              user_id: t.user_id,
              fontSize: t.font_size || 16,
              fontFamily: t.font_family || 'Arial'
            }));
            setTextObjects(initialTexts);
          }

          // Start admin disconnect timer if admin is not connected
          if (receivedRole === 'user' && !boardState.admin_online) {
            const disconnectTime = boardState.admin_disconnected_at;
            if (disconnectTime) {
              const timeLeft = Math.max(0, 600 - (Date.now() / 1000 - disconnectTime));
              setAdminDisconnectTimer(Math.floor(timeLeft));
            }
          }
        }
        break;

      case 'error':
        console.error('WebSocket error:', message.message);
        setIsConnecting(false);
        hasReceivedWelcome.current = false;

        // Set appropriate error message
        if (message.message.includes('not found') || message.message.includes('full')) {
          setConnectionError(message.message);
          // Clear board state and disconnect
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

      case 'user_left':
        setUsers(prev => prev.filter(u => u.id !== message.user_id));

        // Check if admin left
        const wasAdmin = users.find(u => u.id === message.user_id)?.role === 'admin';
        if (wasAdmin) {
          setAdminDisconnectTimer(600); // 10 minutes in seconds
        }
        break;

      case 'stroke_start':
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
        setStrokes(prev => [...prev, newStroke]);
        setObjectCount(prev => prev + 1);

        // Show warning if approaching limit
        if (objectCount + 1 >= 4500) {
          setShowLimitWarning(true);
        }
        break;

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

      case 'shape_create':
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

      case 'text_create':
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

      case 'object_delete':
        // Delete from appropriate array based on object_type
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
    }
  }

  // Admin disconnect timer countdown
  useEffect(() => {
    if (adminDisconnectTimer === null || adminDisconnectTimer <= 0) return;

    const interval = setInterval(() => {
      setAdminDisconnectTimer(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [adminDisconnectTimer]);

  // Monitor connection status - if disconnected and we expected to be connected, show error
  useEffect(() => {
    if (isConnecting && !isConnected && !hasReceivedWelcome.current) {
      // Give it 3 seconds to connect
      const timeout = setTimeout(() => {
        if (!hasReceivedWelcome.current && !isConnected) {
          console.error('Connection timeout');
          setConnectionError('Failed to connect to board. Please try again.');
          setIsConnecting(false);
          handleCompleteDisconnect();
        }
      }, 3000);

      return () => clearTimeout(timeout);
    }
  }, [isConnecting, isConnected]);

  // Complete disconnect and cleanup
  const handleCompleteDisconnect = () => {
    disconnect();
    setBoardId(null);
    setUserId('');
    setUserToken('');
    setIsAdmin(false);
    setUsers([]);
    setStrokes([]);
    setShapes([]);
    setTextObjects([]);
    setObjectCount(0);
    setAdminDisconnectTimer(null);
    hasReceivedWelcome.current = false;

    // Clear localStorage
    localStorage.removeItem('boardId');
    localStorage.removeItem('userId');
    localStorage.removeItem('userToken');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('isCreating');
  };

  // Drawing handlers
  const handleDrawStart = useCallback((point: Point) => {
    if (currentTool === 'eraser') {
      currentEraserPoints.current = [point];
      return;
    }

    currentStrokeId.current = sendStrokeStart?.({
      userId,
      layerId: activeLayerId,
      brushType: currentTool,
      color: currentColor,
      width: getStrokeWidth(currentTool),
      points: [point]
    }) || null;
  }, [sendStrokeStart, userId, activeLayerId, currentTool, currentColor]);

  const handleDrawMove = useCallback((points: Point[]) => {
    if (currentTool === 'eraser' && currentEraserPoints.current.length > 0) {
      currentEraserPoints.current = [...currentEraserPoints.current, ...points];
      sendErasePath?.(points);
      return;
    }

    if (currentStrokeId.current && points.length > 0) {
      sendStrokePoints?.(currentStrokeId.current, points);
      sendCursorUpdate?.(points[0].x, points[0].y, currentTool);
    }
  }, [sendStrokePoints, sendErasePath, sendCursorUpdate, currentTool]);

  const handleDrawEnd = useCallback(() => {
    if (currentTool === 'eraser') {
      currentEraserPoints.current = [];
    }

    // Send stroke end event
    if (currentStrokeId.current) {
      sendStrokeEnd?.(currentStrokeId.current);
    }

    currentStrokeId.current = null;
  }, [currentTool, sendStrokeEnd]);

  const handleShapeStart = useCallback((point: Point) => {
    // Shape drawing starts
  }, []);

  const handleShapeUpdate = useCallback((start: Point, end: Point) => {
    // Shape preview updates
  }, []);

  const handleShapeEnd = useCallback((shape: any) => {
    if (!shape) return;

    sendShapeCreate?.({
      ...shape,
      layer_id: activeLayerId
    });
  }, [sendShapeCreate, activeLayerId]);

  const handleTextCreate = useCallback((text: string, point: Point) => {
    if (!text.trim()) return;

    sendTextCreate?.(text, point, activeLayerId);
  }, [sendTextCreate, activeLayerId]);

  const handleErase = useCallback((points: Point[]) => {
    sendErasePath?.(points);
  }, [sendErasePath]);

  // Admin handlers
  const handleKickUser = useCallback((userId: string) => {
    if (window.confirm('Kick this user?')) {
      // In production: send kick command via WebSocket
      console.log('Kicking user:', userId);
    }
  }, []);

  const handleTimeoutUser = useCallback((userId: string, minutes: number) => {
    if (window.confirm(`Timeout this user for ${minutes} minutes?`)) {
      // In production: send timeout command via WebSocket
      console.log('Timeout user:', userId, 'for', minutes, 'minutes');
    }
  }, []);

  const handleBanUser = useCallback((userId: string) => {
    if (window.confirm('Ban this user (IP + token)?')) {
      // In production: send ban command via WebSocket
      console.log('Banning user:', userId);
    }
  }, []);

  const handleEndSession = useCallback(() => {
    if (window.confirm('End session for all users? This cannot be undone.')) {
      // In production: send end session command via WebSocket
      console.log('Ending session');
    }
  }, []);

  // UI handlers
  const handleCreateBoard = () => {
    setConnectionError('');
    setIsConnecting(true);
    hasReceivedWelcome.current = false;
    localStorage.setItem('isCreating', 'true');
    connect(true);
  };

  const handleJoinBoard = () => {
    if (joinCode.length !== 6) {
      setConnectionError('Board code must be 6 characters');
      return;
    }

    setConnectionError('');
    setIsConnecting(true);
    hasReceivedWelcome.current = false;
    setBoardId(joinCode.toUpperCase());
    localStorage.setItem('isCreating', 'false');
    // Connection will be triggered by useEffect
  };

  const handleUndo = () => {
    sendUndo?.();
  };

  const handleRedo = () => {
    sendRedo?.();
  };

  const handleAddLayer = () => {
    const newLayer = addLayer();
    setActiveLayerId(newLayer.id);
  };

  // Helper functions
  const getStrokeWidth = (tool: ToolType) => {
    switch (tool) {
      case 'pen': return 5;
      case 'marker': return 10;
      case 'highlighter': return 20;
      default: return 5;
    }
  };

  // Filter objects by layer visibility
  const visibleStrokes = strokes.filter(stroke => {
    const layer = layers.find(l => l.id === stroke.layerId);
    return layer && !layer.hidden;
  });

  const visibleShapes = shapes.filter(shape => {
    const layer = layers.find(l => l.id === shape.layer_id);
    return layer && !layer.hidden;
  });

  const visibleTextObjects = textObjects.filter(text => {
    const layer = layers.find(l => l.id === text.layer_id);
    return layer && !layer.hidden;
  });

  // Render join/create screen or drawing board
  if (!boardId || !hasReceivedWelcome.current) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Collaborative Drawing
                </h1>
                <p className="text-gray-600 mt-1">
                  Draw together in real-time with up to 10 users
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full">
            <div className="text-center mb-10">
              <h2 className="text-4xl font-bold text-gray-800 mb-3">
                Start Drawing Together
              </h2>
              <p className="text-gray-600 text-lg">
                Create a new drawing board or join an existing one with a 6-digit code
              </p>
            </div>

            {/* Error Message */}
            {connectionError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <FiAlertCircle className="text-red-600 mr-2" />
                  <p className="text-red-800 font-medium">{connectionError}</p>
                </div>
              </div>
            )}

            {/* Loading State */}
            {isConnecting && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
                  <p className="text-blue-800 font-medium">Connecting to board...</p>
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-8 mb-10">
              <div className="bg-blue-50 p-6 rounded-xl">
                <h3 className="text-xl font-semibold text-blue-800 mb-4">Create New Board</h3>
                <p className="text-blue-600 mb-6">
                  Start a new collaborative drawing session. You'll be the admin with moderation controls.
                </p>
                <button
                  onClick={handleCreateBoard}
                  disabled={isConnecting}
                  className="w-full py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isConnecting ? 'Creating...' : 'Create New Board'}
                </button>
              </div>

              <div className="bg-purple-50 p-6 rounded-xl">
                <h3 className="text-xl font-semibold text-purple-800 mb-4">Join Existing Board</h3>
                <p className="text-purple-600 mb-4">
                  Enter the 6-character code shared by the board creator.
                </p>
                <div className="flex">
                  <input
                    type="text"
                    placeholder="ABCD12"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    className="flex-1 px-5 py-4 border-2 border-r-0 border-purple-300 rounded-l-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-center text-xl font-mono tracking-wider"
                    maxLength={6}
                    disabled={isConnecting}
                  />
                  <button
                    onClick={handleJoinBoard}
                    disabled={joinCode.length !== 6 || isConnecting}
                    className="px-8 py-4 bg-purple-600 text-white rounded-r-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-medium transition-colors"
                  >
                    {isConnecting ? '...' : 'Join'}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Features</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">10</div>
                  <div className="text-sm text-gray-600">Max Users</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">5000</div>
                  <div className="text-sm text-gray-600">Max Objects</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">2h</div>
                  <div className="text-sm text-gray-600">Session Time</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">100ms</div>
                  <div className="text-sm text-gray-600">Latency</div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="bg-white border-t py-6">
          <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
            <p>Draw, collaborate, and create together in real-time. No registration required.</p>
          </div>
        </footer>
      </div>
    );
  }

  // Render drawing board (only if we have a valid connection)
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-full mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Collaborative Drawing</h1>
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-50 px-3 py-1 rounded-lg">
                    <div className="text-xs text-blue-600">Board Code</div>
                    <div className="font-mono text-lg font-bold tracking-wider">{boardId}</div>
                  </div>
                  {isAdmin && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">
                      Admin
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <div className="text-right">
                <div className="text-sm text-gray-500">Connected Users</div>
                <div className="font-semibold">{users.length}/10</div>
              </div>

              <div className="text-right">
                <div className="text-sm text-gray-500">Objects</div>
                <div className={`font-semibold ${objectCount >= 4500 ? 'text-red-600' : ''}`}>
                  {objectCount}/5000
                </div>
              </div>

              {adminDisconnectTimer !== null && adminDisconnectTimer > 0 && (
                <div className="bg-red-50 px-3 py-1 rounded-lg">
                  <div className="text-xs text-red-600">Admin Left</div>
                  <div className="font-semibold text-red-700">
                    Auto-end in: {Math.floor(adminDisconnectTimer / 60)}:{String(adminDisconnectTimer % 60).padStart(2, '0')}
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  if (window.confirm('Leave this drawing board?')) {
                    handleCompleteDisconnect();
                  }
                }}
                className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left sidebar */}
        <div className="w-64 bg-white border-r flex flex-col">
          {/* Tabs */}
          <div className="flex border-b">
            <button
              className={`flex-1 py-3 text-center ${activeTab === 'tools' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
              onClick={() => setActiveTab('tools')}
            >
              <div className="flex items-center justify-center">
                <FiSettings className="mr-2" /> Tools
              </div>
            </button>
            <button
              className={`flex-1 py-3 text-center ${activeTab === 'users' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
              onClick={() => setActiveTab('users')}
            >
              <div className="flex items-center justify-center">
                <FiUsers className="mr-2" /> Users
              </div>
            </button>
            <button
              className={`flex-1 py-3 text-center ${activeTab === 'layers' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
              onClick={() => setActiveTab('layers')}
            >
              <div className="flex items-center justify-center">
                <FiLayers className="mr-2" /> Layers
              </div>
            </button>
            {isAdmin && (
              <button
                className={`flex-1 py-3 text-center ${activeTab === 'admin' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
                onClick={() => setActiveTab('admin')}
              >
                <div className="flex items-center justify-center">
                  <FiSettings className="mr-2" /> Admin
                </div>
              </button>
            )}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'tools' && (
              <Toolbar
                currentTool={currentTool}
                currentColor={currentColor}
                onToolChange={setCurrentTool}
                onColorChange={setCurrentColor}
                onUndo={handleUndo}
                onRedo={handleRedo}
                canUndo={canUndo}
                canRedo={canRedo}
                layers={layers}
                onLayerToggle={toggleLayerVisibility}
                activeLayerId={activeLayerId}
                onLayerChange={setActiveLayerId}
              />
            )}

            {activeTab === 'users' && (
              <UserList
                users={users}
                currentUserId={userId}
                isAdmin={isAdmin}
                onKickUser={handleKickUser}
              />
            )}

            {activeTab === 'layers' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-lg">Layers</h3>
                  <button
                    onClick={handleAddLayer}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    + Add
                  </button>
                </div>

                <div className="space-y-2">
                  {layers.map((layer, index) => (
                    <div
                      key={layer.id}
                      className={`p-3 rounded-lg border ${activeLayerId === layer.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <button
                            onClick={() => toggleLayerVisibility(layer.id)}
                            className="mr-2"
                          >
                            {layer.hidden ? (
                              <span className="text-gray-400">👁️‍🗨️</span>
                            ) : (
                              <span>👁️</span>
                            )}
                          </button>
                          <span className={layer.hidden ? 'text-gray-400' : 'font-medium'}>
                            {layer.name}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {activeLayerId === layer.id && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                          <span className="text-xs text-gray-500">{index + 1}</span>
                        </div>
                      </div>

                      <div className="flex justify-between">
                        <button
                          onClick={() => {
                            const newName = prompt('New layer name:', layer.name);
                            if (newName) renameLayer(layer.id, newName);
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Rename
                        </button>
                        {layers.length > 1 && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete layer "${layer.name}"?`)) {
                                // Handle layer deletion
                              }
                            }}
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-700 mb-2">Active Layer:</div>
                  <div className="font-medium">
                    {layers.find(l => l.id === activeLayerId)?.name || 'None'}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'admin' && isAdmin && (
              <AdminPanel
                users={users}
                currentUserId={userId}
                onKickUser={handleKickUser}
                onTimeoutUser={handleTimeoutUser}
                onBanUser={handleBanUser}
                onEndSession={handleEndSession}
              />
            )}
          </div>
        </div>

        {/* Canvas area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Canvas toolbar */}
          <div className="bg-white border-b px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full mr-2" style={{ backgroundColor: currentColor }} />
                  <div className="font-medium capitalize">{currentTool}</div>
                </div>
                <div className="text-sm text-gray-600">
                  Layer: <span className="font-medium">{layers.find(l => l.id === activeLayerId)?.name || 'Default'}</span>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  Connection: <span className={isConnected ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 relative overflow-auto">
            <EnhancedDrawingCanvas
              width={window.innerWidth * 0.8}
              height={window.innerHeight * 0.8}
              strokes={visibleStrokes}
              shapes={visibleShapes}
              textObjects={visibleTextObjects}
              onDrawStart={handleDrawStart}
              onDrawMove={handleDrawMove}
              onDrawEnd={handleDrawEnd}
              onShapeStart={handleShapeStart}
              onShapeUpdate={handleShapeUpdate}
              onShapeEnd={handleShapeEnd}
              onTextCreate={handleTextCreate}
              onErase={handleErase}
              currentTool={currentTool}
              currentColor={currentColor}
            />

            {/* User cursors */}
            <div className="absolute top-0 left-0 pointer-events-none">
              {users
                .filter(user => user.id !== userId)
                .map(user => (
                  <div
                    key={user.id}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2"
                    style={{ left: user.cursorX, top: user.cursorY }}
                  >
                    <div className="flex flex-col items-center">
                      <div
                        className="w-4 h-4 rounded-full border-2 border-white shadow"
                        style={{ backgroundColor: user.color }}
                      />
                      <div className="mt-1 px-2 py-1 bg-black/80 text-white text-xs rounded whitespace-nowrap">
                        {user.nickname}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </main>

      {/* Warning modals */}
      {showLimitWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md">
            <div className="flex items-center mb-4">
              <FiAlertCircle className="text-yellow-500 text-2xl mr-3" />
              <h3 className="text-lg font-semibold">Approaching Object Limit</h3>
            </div>
            <p className="text-gray-600 mb-4">
              You've created {objectCount} objects out of 5000 maximum.
              Consider removing some objects or ending the session soon.
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowLimitWarning(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom status bar */}
      <div className="bg-gray-800 text-white px-4 py-2 text-sm">
        <div className="flex justify-between items-center">
          <div>
            Board ID: <span className="font-mono">{boardId}</span> •
            Users: <span className="font-medium">{users.length}/10</span> •
            Objects: <span className="font-medium">{objectCount}/5000</span>
          </div>
          <div>
            {isConnected ? (
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Connected
              </div>
            ) : (
              <div className="flex items-center">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                Disconnected
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;