import React from 'react';
import { FiClock, FiLogOut, FiShield, FiUsers } from 'react-icons/fi';

interface BoardHeaderProps {
  boardId: string;
  isAdmin: boolean;
  usersCount: number;
  objectCount: number;
  adminDisconnectTimer: number | null;
  onLeave: () => void;
}

const BoardHeaderComponent: React.FC<BoardHeaderProps> = ({
  boardId,
  isAdmin,
  usersCount,
  objectCount,
  adminDisconnectTimer,
  onLeave
}) => {
  const isAdminDisconnectActive = adminDisconnectTimer !== null && adminDisconnectTimer > 0;

  const formattedDisconnectTime = isAdminDisconnectActive
    ? `${Math.floor(adminDisconnectTimer / 60)}:${String(adminDisconnectTimer % 60).padStart(2, '0')}`
    : null;

  return (
    <header className="relative z-10 px-3 pt-3 sm:px-4 sm:pt-4">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
        <div className="px-4 py-3 sm:px-5 sm:py-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Active Workspace</p>
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900">Collaborative Drawing Board</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <div className="bg-cyan-50 border border-cyan-200 px-3 py-1.5 rounded-lg">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-cyan-700 font-semibold">Board Code</div>
                  <div className="board-code text-base sm:text-lg font-bold tracking-[0.18em] text-cyan-900">{boardId}</div>
                </div>
                {isAdmin && (
                  <span className="inline-flex items-center px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full border border-amber-200">
                    <FiShield className="mr-1" /> Admin
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 min-w-[102px]">
              <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500 font-semibold">Users</div>
              <div className="font-semibold text-slate-900 inline-flex items-center">
                <FiUsers className="mr-1.5 text-cyan-700" />
                {usersCount}/10
              </div>
            </div>

            <div className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 min-w-[102px]">
              <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500 font-semibold">Objects</div>
              <div className={`font-semibold ${objectCount >= 4500 ? 'text-rose-700' : 'text-slate-900'}`}>
                {objectCount}/5000
              </div>
            </div>

            {isAdminDisconnectActive && formattedDisconnectTime && (
              <div className="px-3 py-2 rounded-xl border border-rose-200 bg-rose-50">
                <div className="text-[10px] uppercase tracking-[0.12em] text-rose-600 font-semibold">Admin Left</div>
                <div className="font-semibold text-rose-800 inline-flex items-center">
                  <FiClock className="mr-1.5" />
                  {formattedDisconnectTime}
                </div>
              </div>
            )}

            <button
              onClick={onLeave}
              className="px-4 py-2.5 text-rose-700 border border-rose-300 rounded-xl bg-white hover:bg-rose-50 font-semibold inline-flex items-center"
            >
              <FiLogOut className="mr-1.5" />
              Leave
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export const BoardHeader = React.memo(BoardHeaderComponent);
