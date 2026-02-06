import React from 'react';
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
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
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

      <div className="flex-1 relative overflow-auto">
        <DrawingCanvas
          width={window.innerWidth * 0.8}
          height={window.innerHeight * 0.8}
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
  );
};
