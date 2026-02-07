import React, { useState } from 'react';
import { User } from '../../types/drawing';
import { FiClock, FiPower, FiShield, FiUserX, FiXCircle } from 'react-icons/fi';

interface AdminPanelProps {
  users: User[];
  currentUserId: string;
  onKickUser: (userId: string) => void;
  onTimeoutUser: (userId: string, minutes: number) => void;
  onBanUser: (userId: string) => void;
  onEndSession: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  users,
  currentUserId,
  onKickUser,
  onTimeoutUser,
  onBanUser,
  onEndSession
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [timeoutMinutes, setTimeoutMinutes] = useState<number>(5);

  const selectedUser = users.find(u => u.id === selectedUserId);

  return (
    <div className="rounded-xl border border-rose-200 bg-white p-4">
      <h3 className="font-bold text-lg mb-4 text-rose-700 inline-flex items-center">
        <FiShield className="mr-2" /> Admin Controls
      </h3>

      <div className="mb-5">
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Select User
        </label>
        <select
          className="w-full p-2.5 border border-slate-300 rounded-lg bg-white"
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
        >
          <option value="">Choose a user...</option>
          {users
            .filter(u => u.id !== currentUserId)
            .map(user => (
              <option key={user.id} value={user.id}>
                {user.nickname} ({user.role})
              </option>
            ))}
        </select>
      </div>

      {selectedUser && (
        <div className="mb-5 p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <div className="font-semibold text-slate-900">{selectedUser.nickname}</div>
            <div className="text-xs text-slate-500">ID: {selectedUser.id}</div>
          </div>
          <div className="text-sm text-slate-600">
            Tool: {selectedUser.activeTool} | Cursor: {selectedUser.cursorX.toFixed(0)}, {selectedUser.cursorY.toFixed(0)}
          </div>
        </div>
      )}

      <div className="space-y-2.5">
        <button
          onClick={() => selectedUserId && onKickUser(selectedUserId)}
          disabled={!selectedUserId}
          className="w-full flex items-center justify-center p-2.5 border border-slate-300 rounded-lg hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FiUserX className="mr-2" /> Kick User
        </button>

        <div className="flex space-x-2">
          <select
            className="flex-1 p-2.5 border border-slate-300 rounded-lg bg-white"
            value={timeoutMinutes}
            onChange={(e) => setTimeoutMinutes(Number(e.target.value))}
          >
            <option value={5}>5 minutes</option>
            <option value={10}>10 minutes</option>
            <option value={20}>20 minutes</option>
          </select>
          <button
            onClick={() => selectedUserId && onTimeoutUser(selectedUserId, timeoutMinutes)}
            disabled={!selectedUserId}
            className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
          >
            <FiClock className="mr-1.5" /> Timeout
          </button>
        </div>

        <button
          onClick={() => selectedUserId && onBanUser(selectedUserId)}
          disabled={!selectedUserId}
          className="w-full flex items-center justify-center p-2.5 border border-slate-300 rounded-lg hover:bg-rose-100 hover:text-rose-800 hover:border-rose-400 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FiXCircle className="mr-2" /> Ban User (IP + Token)
        </button>

        <div className="pt-3 border-t border-slate-200">
          <button
            onClick={onEndSession}
            className="w-full flex items-center justify-center p-2.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700"
          >
            <FiPower className="mr-2" /> End Session for All Users
          </button>
          <p className="text-xs text-slate-500 mt-2">
            This clears current board drawings and disconnects everyone.
          </p>
        </div>
      </div>

      <div className="mt-5 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <h4 className="font-semibold text-amber-800 mb-1.5">Session Limits</h4>
        <div className="text-sm text-amber-700 space-y-1">
          <div>Max users: 10</div>
          <div>Max objects: 5000</div>
          <div>Session lifetime: 2 hours</div>
          <div>Admin disconnect timeout: 10 minutes</div>
        </div>
      </div>
    </div>
  );
};
