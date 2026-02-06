import React from 'react';

interface BoardStatusBarProps {
  boardId: string;
  usersCount: number;
  objectCount: number;
  isConnected: boolean;
}

export const BoardStatusBar: React.FC<BoardStatusBarProps> = ({
  boardId,
  usersCount,
  objectCount,
  isConnected
}) => {
  return (
    <div className="bg-gray-800 text-white px-4 py-2 text-sm">
      <div className="flex justify-between items-center">
        <div>
          Board ID: <span className="font-mono">{boardId}</span> •
          Users: <span className="font-medium">{usersCount}/10</span> •
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
  );
};
