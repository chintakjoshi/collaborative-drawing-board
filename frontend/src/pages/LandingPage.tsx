import React from 'react';
import { FiAlertCircle } from 'react-icons/fi';

interface LandingPageProps {
  connectionError: string;
  isConnecting: boolean;
  joinCode: string;
  onJoinCodeChange: (value: string) => void;
  onCreateBoard: () => void;
  onJoinBoard: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  connectionError,
  isConnecting,
  joinCode,
  onJoinCodeChange,
  onCreateBoard,
  onJoinBoard
}) => {
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

          {connectionError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <FiAlertCircle className="text-red-600 mr-2" />
                <p className="text-red-800 font-medium">{connectionError}</p>
              </div>
            </div>
          )}

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
                Start a new collaborative drawing session. You will be the admin with moderation controls.
              </p>
              <button
                onClick={onCreateBoard}
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
                  onChange={(e) => onJoinCodeChange(e.target.value.toUpperCase())}
                  className="flex-1 px-5 py-4 border-2 border-r-0 border-purple-300 rounded-l-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-center text-xl font-mono tracking-wider"
                  maxLength={6}
                  disabled={isConnecting}
                />
                <button
                  onClick={onJoinBoard}
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
};
