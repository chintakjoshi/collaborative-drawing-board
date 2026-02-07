import React from 'react';
import { FiDatabase, FiHash, FiUsers } from 'react-icons/fi';

interface BoardStatusBarProps {
  boardId: string;
  usersCount: number;
  objectCount: number;
  isConnected: boolean;
}

const BoardStatusBarComponent: React.FC<BoardStatusBarProps> = ({
  boardId,
  usersCount,
  objectCount,
  isConnected
}) => {
  return (
    <div className="relative z-10 px-3 pb-3 sm:px-4 sm:pb-4">
      <div className="rounded-xl border border-white/60 bg-slate-900 text-slate-100 px-4 py-2.5 text-sm shadow-[0_16px_35px_rgba(15,23,42,0.24)]">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <div className="inline-flex items-center">
              <FiHash className="mr-1.5 text-cyan-300" />
              Board <span className="board-code ml-1.5 font-semibold tracking-[0.12em]">{boardId}</span>
            </div>
            <div className="inline-flex items-center">
              <FiUsers className="mr-1.5 text-cyan-300" />
              Users <span className="ml-1 font-semibold">{usersCount}/10</span>
            </div>
            <div className="inline-flex items-center">
              <FiDatabase className="mr-1.5 text-cyan-300" />
              Objects <span className="ml-1 font-semibold">{objectCount}/5000</span>
            </div>
          </div>
          <div>
            {isConnected ? (
              <div className="flex items-center text-emerald-300 font-medium">
                <div className="w-2 h-2 bg-emerald-400 rounded-full mr-2"></div>
                Connected
              </div>
            ) : (
              <div className="flex items-center text-rose-300 font-medium">
                <div className="w-2 h-2 bg-rose-400 rounded-full mr-2"></div>
                Disconnected
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const BoardStatusBar = React.memo(BoardStatusBarComponent);
