import React from 'react';
import { BoardHeader } from '../components/Board/BoardHeader';
import { BoardSidebar } from '../components/Board/BoardSidebar';
import { BoardCanvasArea } from '../components/Board/BoardCanvasArea';
import { BoardStatusBar } from '../components/Board/BoardStatusBar';
import { LimitWarningModal } from '../components/Board/LimitWarningModal';
import { Layer, Point, Stroke, ToolType, User } from '../types/drawing';
import { Shape, TextObject } from '../types/boardObjects';

type TabKey = 'tools' | 'users' | 'layers' | 'admin';

interface BoardPageProps {
  boardId: string;
  isAdmin: boolean;
  users: User[];
  objectCount: number;
  adminDisconnectTimer: number | null;
  onLeave: () => void;
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  currentTool: ToolType;
  currentColor: string;
  onToolChange: (tool: ToolType) => void;
  onColorChange: (color: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  layers: Layer[];
  activeLayerId: string;
  onLayerToggle: (layerId: string) => void;
  onLayerChange: (layerId: string) => void;
  onAddLayer: () => void;
  onRenameLayer: (layerId: string, name: string) => void;
  onKickUser: (userId: string) => void;
  onTimeoutUser: (userId: string, minutes: number) => void;
  onBanUser: (userId: string) => void;
  onEndSession: () => void;
  visibleStrokes: Stroke[];
  visibleShapes: Shape[];
  visibleTextObjects: TextObject[];
  onDrawStart: (point: Point) => void;
  onDrawMove: (points: Point[]) => void;
  onDrawEnd: () => void;
  onShapeStart: (point: Point) => void;
  onShapeUpdate: (start: Point, end: Point) => void;
  onShapeEnd: (shape: any) => void;
  onTextCreate: (text: string, point: Point) => void;
  onErase: (points: Point[]) => void;
  isConnected: boolean;
  currentUserId: string;
  showLimitWarning: boolean;
  onDismissLimitWarning: () => void;
}

export const BoardPage: React.FC<BoardPageProps> = ({
  boardId,
  isAdmin,
  users,
  objectCount,
  adminDisconnectTimer,
  onLeave,
  activeTab,
  onTabChange,
  currentTool,
  currentColor,
  onToolChange,
  onColorChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  layers,
  activeLayerId,
  onLayerToggle,
  onLayerChange,
  onAddLayer,
  onRenameLayer,
  onKickUser,
  onTimeoutUser,
  onBanUser,
  onEndSession,
  visibleStrokes,
  visibleShapes,
  visibleTextObjects,
  onDrawStart,
  onDrawMove,
  onDrawEnd,
  onShapeStart,
  onShapeUpdate,
  onShapeEnd,
  onTextCreate,
  onErase,
  isConnected,
  currentUserId,
  showLimitWarning,
  onDismissLimitWarning
}) => {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <BoardHeader
        boardId={boardId}
        isAdmin={isAdmin}
        usersCount={users.length}
        objectCount={objectCount}
        adminDisconnectTimer={adminDisconnectTimer}
        onLeave={onLeave}
      />

      <main className="flex-1 flex overflow-hidden">
        <BoardSidebar
          activeTab={activeTab}
          onTabChange={onTabChange}
          isAdmin={isAdmin}
          currentTool={currentTool}
          currentColor={currentColor}
          onToolChange={onToolChange}
          onColorChange={onColorChange}
          onUndo={onUndo}
          onRedo={onRedo}
          canUndo={canUndo}
          canRedo={canRedo}
          layers={layers}
          activeLayerId={activeLayerId}
          onLayerToggle={onLayerToggle}
          onLayerChange={onLayerChange}
          onAddLayer={onAddLayer}
          onRenameLayer={onRenameLayer}
          users={users}
          currentUserId={currentUserId}
          onKickUser={onKickUser}
          onTimeoutUser={onTimeoutUser}
          onBanUser={onBanUser}
          onEndSession={onEndSession}
        />

        <BoardCanvasArea
          currentTool={currentTool}
          currentColor={currentColor}
          layers={layers}
          activeLayerId={activeLayerId}
          isConnected={isConnected}
          strokes={visibleStrokes}
          shapes={visibleShapes}
          textObjects={visibleTextObjects}
          onDrawStart={onDrawStart}
          onDrawMove={onDrawMove}
          onDrawEnd={onDrawEnd}
          onShapeStart={onShapeStart}
          onShapeUpdate={onShapeUpdate}
          onShapeEnd={onShapeEnd}
          onTextCreate={onTextCreate}
          onErase={onErase}
          users={users}
          currentUserId={currentUserId}
        />
      </main>

      <LimitWarningModal
        show={showLimitWarning}
        objectCount={objectCount}
        onDismiss={onDismissLimitWarning}
      />

      <BoardStatusBar
        boardId={boardId}
        usersCount={users.length}
        objectCount={objectCount}
        isConnected={isConnected}
      />
    </div>
  );
};
