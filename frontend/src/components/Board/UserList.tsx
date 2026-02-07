import React from 'react';
import { User } from '../../types/drawing';
import { FiShield, FiUser } from 'react-icons/fi';

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
        <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="font-bold text-lg mb-3 text-slate-900">Users ({users.length}/10)</h3>
            <div className="space-y-2.5">
                {users.map((user) => (
                    <div
                        key={user.id}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-transparent hover:border-slate-200 hover:bg-slate-50"
                    >
                        <div className="flex items-center space-x-3">
                            <div className="relative">
                                <FiUser className="w-5 h-5 text-slate-400" />
                                {user.role === 'admin' && (
                                    <FiShield className="absolute -top-1 -right-1 w-3 h-3 text-amber-500" />
                                )}
                            </div>
                            <div>
                                <div className="font-semibold text-slate-900">
                                    {user.nickname}
                                    {user.id === currentUserId && (
                                        <span className="ml-2 text-xs text-cyan-600">(You)</span>
                                    )}
                                </div>
                                <div className="text-xs text-slate-500 capitalize">
                                    {user.activeTool}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center">
                            <div
                                className="w-3 h-3 rounded-full mr-2 border border-slate-300"
                                style={{ backgroundColor: user.color }}
                            />
                            {isAdmin && user.id !== currentUserId && (
                                <button
                                    onClick={() => onKickUser?.(user.id)}
                                    className="text-xs text-rose-600 hover:text-rose-700 font-medium"
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
