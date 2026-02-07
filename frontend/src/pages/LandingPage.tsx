import React from 'react';
import {
  FiAlertCircle,
  FiArrowRight,
  FiClock,
  FiGrid,
  FiUsers,
  FiZap
} from 'react-icons/fi';
import './LandingPage.css';

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
  const normalizedJoinCode = joinCode.toUpperCase();

  const handleJoinCodeChange = (value: string) => {
    const sanitized = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    onJoinCodeChange(sanitized);
  };

  const handleJoinSubmit = () => {
    if (normalizedJoinCode.length === 6 && !isConnecting) {
      onJoinBoard();
    }
  };

  return (
    <div className="landing-page min-h-screen relative overflow-hidden flex flex-col text-slate-900">
      <div className="landing-orb landing-orb-1" aria-hidden="true" />
      <div className="landing-orb landing-orb-2" aria-hidden="true" />
      <div className="landing-grid-overlay" aria-hidden="true" />

      <header className="relative z-10">
        <div className="max-w-6xl mx-auto px-4 pt-8 pb-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between rounded-2xl border border-white/40 bg-white/70 backdrop-blur-md px-5 py-4 shadow-[0_12px_50px_rgba(25,42,70,0.12)]">
            <p className="text-xs md:text-sm font-semibold uppercase tracking-[0.16em] text-slate-600">
              Collaborative Drawing Board
            </p>
            <span className="hidden md:inline-flex text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              No Signup Needed
            </span>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 px-4 pb-8 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <section className="landing-fade-up rounded-3xl border border-white/40 bg-white/75 backdrop-blur-xl shadow-[0_30px_110px_rgba(27,37,60,0.16)] p-6 sm:p-8 lg:p-10">
            <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-8 lg:gap-12 items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-800 mb-4">
                  Shared Canvas for Teams
                </p>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.06] text-slate-900">
                  Draw ideas live, together.
                </h1>
                <p className="text-base sm:text-lg text-slate-600 mt-5 max-w-xl leading-relaxed">
                  Spin up a board in one click, share the room code, and sketch in
                  sync with your group in under a second.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <span className="inline-flex items-center px-3 py-2 rounded-full border border-cyan-200 bg-cyan-50 text-cyan-900 text-xs font-semibold tracking-wide">
                    Real-time strokes
                  </span>
                  <span className="inline-flex items-center px-3 py-2 rounded-full border border-amber-200 bg-amber-50 text-amber-900 text-xs font-semibold tracking-wide">
                    Layer support
                  </span>
                  <span className="inline-flex items-center px-3 py-2 rounded-full border border-rose-200 bg-rose-50 text-rose-900 text-xs font-semibold tracking-wide">
                    Admin moderation
                  </span>
                </div>
              </div>

              <aside className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-[0_20px_50px_rgba(14,25,42,0.08)]">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Session Snapshot
                </p>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Users</p>
                    <p className="text-2xl font-semibold text-slate-900 mt-1">10</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Objects</p>
                    <p className="text-2xl font-semibold text-slate-900 mt-1">5000</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Duration</p>
                    <p className="text-2xl font-semibold text-slate-900 mt-1">2h</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Latency</p>
                    <p className="text-2xl font-semibold text-slate-900 mt-1">&lt;100ms</p>
                  </div>
                </div>
              </aside>
            </div>
          </section>

          {connectionError && (
            <div className="landing-fade-up mt-5 p-4 bg-rose-50 border border-rose-200 rounded-xl">
              <div className="flex items-center">
                <FiAlertCircle className="text-rose-700 mr-2.5" />
                <p className="text-rose-900 font-medium">{connectionError}</p>
              </div>
            </div>
          )}

          {isConnecting && (
            <div className="landing-fade-up mt-5 p-4 bg-cyan-50 border border-cyan-200 rounded-xl">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-cyan-700 mr-3"></div>
                <p className="text-cyan-900 font-medium">Connecting to board...</p>
              </div>
            </div>
          )}

          <section className="landing-fade-up mt-6 grid md:grid-cols-2 gap-5">
            <div className="rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-blue-100 p-6 shadow-[0_20px_50px_rgba(18,68,117,0.14)]">
              <h2 className="text-2xl font-semibold text-slate-900">Create a Board</h2>
              <p className="text-slate-700 mt-3 leading-relaxed">
                Launch a fresh room and start as admin with controls for user moderation and session management.
              </p>
              <button
                onClick={onCreateBoard}
                disabled={isConnecting}
                className="mt-6 w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-base font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isConnecting ? 'Creating...' : 'Create New Board'}
                <FiArrowRight className="text-base" />
              </button>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-100 p-6 shadow-[0_20px_50px_rgba(133,80,13,0.12)]">
              <h2 className="text-2xl font-semibold text-slate-900">Join with Code</h2>
              <p className="text-slate-700 mt-3 mb-4 leading-relaxed">
                Paste the 6-character room code from your teammate to jump into the same live canvas.
              </p>
              <div className="flex">
                <input
                  type="text"
                  placeholder="ABCD12"
                  value={normalizedJoinCode}
                  onChange={(e) => handleJoinCodeChange(e.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      handleJoinSubmit();
                    }
                  }}
                  className="join-code-input flex-1 px-5 py-3.5 border-2 border-r-0 border-amber-300 rounded-l-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-center text-2xl font-medium tracking-[0.28em] uppercase"
                  maxLength={6}
                  disabled={isConnecting}
                />
                <button
                  onClick={handleJoinSubmit}
                  disabled={normalizedJoinCode.length !== 6 || isConnecting}
                  className="px-7 py-3.5 bg-amber-500 text-slate-900 rounded-r-xl hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-base font-semibold transition-colors"
                >
                  {isConnecting ? '...' : 'Join'}
                </button>
              </div>
            </div>
          </section>

          <section className="landing-fade-up mt-6 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm p-5">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="feature-tile">
                <FiUsers className="text-cyan-700 text-xl" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Multi-user session</p>
                  <p className="text-xs text-slate-600">Up to 10 active participants</p>
                </div>
              </div>
              <div className="feature-tile">
                <FiGrid className="text-blue-700 text-xl" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">High object ceiling</p>
                  <p className="text-xs text-slate-600">Designed for dense whiteboards</p>
                </div>
              </div>
              <div className="feature-tile">
                <FiClock className="text-amber-700 text-xl" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">2 hour room window</p>
                  <p className="text-xs text-slate-600">Plenty for workshops and reviews</p>
                </div>
              </div>
              <div className="feature-tile">
                <FiZap className="text-rose-700 text-xl" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Low-latency sync</p>
                  <p className="text-xs text-slate-600">Fast updates while drawing live</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="relative z-10 py-6">
        <div className="max-w-6xl mx-auto px-4 text-center text-slate-600 text-sm">
          <p>Draw and collaborate in real-time with no setup overhead.</p>
        </div>
      </footer>
    </div>
  );
};
