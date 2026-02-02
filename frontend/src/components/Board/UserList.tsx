import React from 'react';
import { User } from '../../types/drawing';
import { FiUser, FiFrown } from 'react-icons/fi';

interface UserListProps {
    users: User[];
    currentUserId: string;
    isAdmin: boolean;
    onKickUser?: (userId: string) => void;
}

export const UserList: React.FC<UserListProps> = ({
    users,
    currentUserId,
    isAdmin,
    onKickUser
}) => {
    return (
        <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold text-lg mb-3">Users ({users.length}/10)</h3>
            <div className="space-y-2">
                {users.map((user) => (
                    <div
                        key={user.id}
                        className="flex items-center justify-between p-2 rounded hover:bg-gray-50"
                    >
                        <div className="flex items-center space-x-3">
                            <div className="relative">
                                <FiUser className="w-6 h-6 text-gray-400" />
                                {user.role === 'admin' && (
                                    <FiFrown className="absolute -top-1 -right-1 w-3 h-3 text-yellow-500" />
                                )}
                            </div>
                            <div>
                                <div className="font-medium">
                                    {user.nickname}
                                    {user.id === currentUserId && (
                                        <span className="ml-2 text-xs text-blue-500">(You)</span>
                                    )}
                                </div>
                                <div className="text-xs text-gray-500 capitalize">
                                    {user.activeTool}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center">
                            <div
                                className="w-3 h-3 rounded-full mr-2"
                                style={{ backgroundColor: user.color }}
                            />
                            {isAdmin && user.id !== currentUserId && (
                                <button
                                    onClick={() => onKickUser?.(user.id)}
                                    className="text-xs text-red-500 hover:text-red-700"
                                >
                                    Kick
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};