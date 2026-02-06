import React from 'react';
import { useState, useCallback, useRef } from 'react';
import { LandingPage } from './pages/LandingPage';
import { BoardPage } from './pages/BoardPage';
import { useDrawingWebSocket } from './hooks/useDrawingWebSocket';
import { useLayers } from './hooks/useLayers';
import { useBoardSession } from './hooks/useBoardSession';
import { useBoardWebSocketHandler } from './hooks/useBoardWebSocketHandler';
import { useDrawingHandlers } from './hooks/useDrawingHandlers';
import { useAdminDisconnectTimer } from './hooks/useAdminDisconnectTimer';
import { Stroke, Point, User, ToolType } from './types/drawing';
import { Shape, TextObject } from './types/boardObjects';

function App() {
  // Board state
  const [boardId, setBoardId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [userToken, setUserToken] = useState<string | null>(null);
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

  // Refs
  const hasReceivedWelcome = useRef(false);

  // Custom hooks
  const { layers, activeLayerId, setActiveLayerId, addLayer, toggleLayerVisibility, renameLayer } = useLayers();
  const webSocketHandlerRef = useRef<(message: any) => void>(() => {});

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
  } = useDrawingWebSocket(
    boardId,
    userId,
    (message) => webSocketHandlerRef.current(message),
    userToken
  );

  const { handleCreateBoard, handleJoinBoard, handleCompleteDisconnect, handleLeaveBoard } = useBoardSession({
    boardId,
    joinCode,
    isConnecting,
    isConnected,
    connect,
    disconnect,
    setBoardId,
    setUserId,
    setUserToken,
    setIsAdmin,
    setUsers,
    setStrokes,
    setShapes,
    setTextObjects,
    setObjectCount,
    setAdminDisconnectTimer,
    setIsConnecting,
    setConnectionError,
    hasReceivedWelcomeRef: hasReceivedWelcome
  });

  const handleWebSocketMessage = useBoardWebSocketHandler({
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
    hasReceivedWelcomeRef: hasReceivedWelcome,
    handleCompleteDisconnect
  });

  useAdminDisconnectTimer(adminDisconnectTimer, setAdminDisconnectTimer);
  webSocketHandlerRef.current = handleWebSocketMessage;

  const drawingHandlers = useDrawingHandlers({
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
  });

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
      <LandingPage
        connectionError={connectionError}
        isConnecting={isConnecting}
        joinCode={joinCode}
        onJoinCodeChange={setJoinCode}
        onCreateBoard={handleCreateBoard}
        onJoinBoard={handleJoinBoard}
      />
    );
  }

  // Render drawing board (only if we have a valid connection)
  return (
    <BoardPage
      boardId={boardId}
      isAdmin={isAdmin}
      users={users}
      objectCount={objectCount}
      adminDisconnectTimer={adminDisconnectTimer}
      onLeave={handleLeaveBoard}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      currentTool={currentTool}
      currentColor={currentColor}
      onToolChange={setCurrentTool}
      onColorChange={setCurrentColor}
      onUndo={handleUndo}
      onRedo={handleRedo}
      canUndo={canUndo}
      canRedo={canRedo}
      layers={layers}
      activeLayerId={activeLayerId}
      onLayerToggle={toggleLayerVisibility}
      onLayerChange={setActiveLayerId}
      onAddLayer={handleAddLayer}
      onRenameLayer={renameLayer}
      onKickUser={handleKickUser}
      onTimeoutUser={handleTimeoutUser}
      onBanUser={handleBanUser}
      onEndSession={handleEndSession}
      visibleStrokes={visibleStrokes}
      visibleShapes={visibleShapes}
      visibleTextObjects={visibleTextObjects}
      onDrawStart={drawingHandlers.handleDrawStart}
      onDrawMove={drawingHandlers.handleDrawMove}
      onDrawEnd={drawingHandlers.handleDrawEnd}
      onShapeStart={handleShapeStart}
      onShapeUpdate={handleShapeUpdate}
      onShapeEnd={handleShapeEnd}
      onTextCreate={handleTextCreate}
      onErase={handleErase}
      isConnected={isConnected}
      currentUserId={userId}
      showLimitWarning={showLimitWarning}
      onDismissLimitWarning={() => setShowLimitWarning(false)}
    />
  );
}

export default App;
