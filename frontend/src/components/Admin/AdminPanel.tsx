import React, { useState } from 'react';
import { User } from '../../types/drawing';
import { FiUserX, FiClock, FiXCircle, FiPower } from 'react-icons/fi';

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
        <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold text-lg mb-4 text-red-600">Admin Controls</h3>

            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select User
                </label>
                <select
                    className="w-full p-2 border rounded-lg"
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
                <div className="mb-6 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">{selectedUser.nickname}</div>
                        <div className="text-sm text-gray-500">ID: {selectedUser.id}</div>
                    </div>
                    <div className="text-sm text-gray-600">
                        Tool: {selectedUser.activeTool} • Position: {selectedUser.cursorX.toFixed(0)}, {selectedUser.cursorY.toFixed(0)}
                    </div>
                </div>
            )}

            <div className="space-y-3">
                <button
                    onClick={() => selectedUserId && onKickUser(selectedUserId)}
                    disabled={!selectedUserId}
                    className="w-full flex items-center justify-center p-3 border rounded-lg hover:bg-red-50 hover:text-red-700 hover:border-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <FiUserX className="mr-2" /> Kick User
                </button>

                <div className="flex space-x-2">
                    <select
                        className="flex-1 p-2 border rounded-lg"
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
                        className="px-4 py-2 border rounded-lg hover:bg-yellow-50 hover:text-yellow-700 hover:border-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <FiClock className="mr-2 inline" /> Timeout
                    </button>
                </div>

                <button
                    onClick={() => selectedUserId && onBanUser(selectedUserId)}
                    disabled={!selectedUserId}
                    className="w-full flex items-center justify-center p-3 border rounded-lg hover:bg-red-100 hover:text-red-800 hover:border-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <FiXCircle className="mr-2" /> Ban User (IP + Token)
                </button>

                <div className="pt-4 border-t">
                    <button
                        onClick={onEndSession}
                        className="w-full flex items-center justify-center p-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                        <FiPower className="mr-2" /> End Session for All Users
                    </button>
                    <p className="text-xs text-gray-500 mt-2">
                        Ending the session will destroy all drawings and disconnect all users.
                    </p>
                </div>
            </div>

            <div className="mt-6 p-3 bg-yellow-50 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-2">Session Limits</h4>
                <div className="text-sm text-yellow-700">
                    <div>• Max users: 10</div>
                    <div>• Max objects: 5000</div>
                    <div>• Session lifetime: 2 hours</div>
                    <div>• Admin disconnect: 10min auto-shutdown</div>
                </div>
            </div>
        </div>
    );
};