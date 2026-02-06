import React from 'react';

interface BoardHeaderProps {
  boardId: string;
  isAdmin: boolean;
  usersCount: number;
  objectCount: number;
  adminDisconnectTimer: number | null;
  onLeave: () => void;
}

export const BoardHeader: React.FC<BoardHeaderProps> = ({
  boardId,
  isAdmin,
  usersCount,
  objectCount,
  adminDisconnectTimer,
  onLeave
}) => {
  return (
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
              <div className="font-semibold">{usersCount}/10</div>
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
              onClick={onLeave}
              className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
            >
              Leave
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
