import React from 'react';
import { Trophy, X, Play, Crown } from 'lucide-react';
import { CARS } from '../game/cars';
import { getSavedDriverTag, LeaderboardEntry } from '../game/leaderboard';
import { CarIllustration } from './CarIllustration';

interface LeaderboardModalProps {
  entries: LeaderboardEntry[];
  loading: boolean;
  errorMsg: string | null;
  highlightEntryId?: string | null;
  onClose: () => void;
  onChallengeEntry: (entry: LeaderboardEntry) => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  entries,
  loading,
  errorMsg,
  highlightEntryId,
  onClose,
  onChallengeEntry,
}) => {
  const topEntries = entries.slice(0, 25);
  const kingpin = topEntries[0] ?? null;
  const restEntries = topEntries.slice(1);
  const currentDriverKey = getSavedDriverTag().trim().toLowerCase();

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center bg-[#0B0D14]/90 p-4 overflow-y-auto touch-pan-y text-center">
      <div className="w-full max-w-2xl rounded-xl bg-[#131826] border border-white/12 p-5 sm:p-6 shadow-2xl my-auto max-h-[90vh] flex flex-col text-center">
        {/* Centered Header */}
        <div className="relative flex flex-col items-center pb-4 border-b border-white/10">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close leaderboard"
            className="absolute top-0 right-0 flex items-center justify-center w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-10 h-10 rounded-lg bg-[#FFB347]/15 border border-[#FFB347]/35 flex items-center justify-center text-[#FFB347] mb-2">
            <Trophy className="w-5 h-5" />
          </div>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-white leading-none">
            GTA6 Web Game
          </h2>
          <p className="mt-1.5 text-xs text-slate-400">
            Unique Driver Records · Created by Rakesh Bhardwaj
          </p>
        </div>

        {/* Error Message */}
        {errorMsg && (
          <div className="mt-3 px-3.5 py-2.5 rounded-lg bg-[#EF4444]/15 border border-[#EF4444]/40 text-xs text-[#FCA5A5] break-words text-center">
            {errorMsg}
          </div>
        )}

        {/* Scrollable Board */}
        <div className="mt-4 flex-1 overflow-y-auto min-h-[240px] space-y-3">
          {loading ? (
            <div className="py-16 text-center text-sm text-slate-400">
              Loading unique driver records...
            </div>
          ) : topEntries.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm font-medium text-slate-300">
                No scores posted yet.
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Finish a run and save your haul to claim the #1 Kingpin throne.
              </p>
            </div>
          ) : (
            <>
              {/* #1 Kingpin Spotlight */}
              {kingpin && (
                <div
                  className={`rounded-xl p-4 border text-center flex flex-col items-center gap-2 ${
                    highlightEntryId === kingpin.id
                      ? 'bg-[#FFB347]/18 border-[#FFB347]'
                      : 'bg-gradient-to-b from-[#FFB347]/14 to-[#0B0D14]/65 border-[#FFB347]/45'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-[#FFB347] tracking-wide">
                    <Crown className="w-4 h-4" />
                    <span>#1 ROAD KINGPIN</span>
                  </div>

                  <div className="flex items-center justify-center gap-3">
                    <CarIllustration
                      car={CARS[kingpin.carId] ?? CARS.cheetah}
                      className="w-7 h-12 shrink-0"
                    />
                    <div>
                      <div className="font-display font-extrabold text-2xl sm:text-3xl text-white leading-tight">
                        {kingpin.driverName}
                      </div>
                      <div className="text-xs text-[#5EEAD4] font-semibold">
                        {kingpin.titleEarned}
                      </div>
                    </div>
                  </div>

                  <div className="font-display font-extrabold text-4xl sm:text-5xl text-[#FFB347] leading-none tabular-nums">
                    ${kingpin.haul.toLocaleString()}
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-300">
                    <span className="tabular-nums">
                      {(kingpin.distanceMeters / 1000).toFixed(2)} km
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">
                      {kingpin.copsWrecked} cops
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#FF5E7E]">
                      {'★'.repeat(kingpin.peakStars)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onChallengeEntry(kingpin)}
                    className="mt-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#FF5E7E] hover:bg-[#FF7490] text-[#0B0D14] text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Challenge #1</span>
                  </button>
                </div>
              )}

              {/* Remaining Ranked Unique Drivers */}
              {restEntries.length > 0 && (
                <div className="divide-y divide-white/8">
                  {restEntries.map((entry, idx) => {
                    const rank = idx + 2;
                    const isLocalDriver =
                      entry.driverName.trim().toLowerCase() === currentDriverKey;
                    const isHighlighted = highlightEntryId === entry.id;
                    const car = CARS[entry.carId] ?? CARS.cheetah;
                    return (
                      <div
                        key={entry.id}
                        className={`flex flex-col sm:flex-row items-center justify-between gap-3 py-3 px-3 rounded-lg text-center ${
                          isHighlighted
                            ? 'bg-[#FFB347]/15 border border-[#FFB347]/40'
                            : isLocalDriver
                            ? 'bg-white/[0.04]'
                            : ''
                        }`}
                      >
                        <div className="flex items-center justify-center gap-3 min-w-0">
                          <span
                            className={`font-mono-num text-sm font-bold w-8 shrink-0 text-center ${
                              rank === 2
                                ? 'text-slate-200'
                                : rank === 3
                                ? 'text-[#FB923C]'
                                : 'text-slate-400'
                            }`}
                          >
                            #{rank}
                          </span>

                          <CarIllustration car={car} className="w-5 h-9 shrink-0" />

                          <div className="min-w-0 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <span className="font-semibold text-sm text-white truncate">
                                {entry.driverName}
                              </span>
                              {isLocalDriver && (
                                <span className="text-[11px] font-semibold text-[#2DD4BF]">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs text-slate-400">
                              <span className="tabular-nums">
                                {(entry.distanceMeters / 1000).toFixed(2)} km
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="text-[#FF5E7E]">
                                {'★'.repeat(entry.peakStars)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-center gap-3 shrink-0">
                          <div className="text-center">
                            <div className="font-display font-extrabold text-2xl leading-none text-[#FFB347] tabular-nums">
                              ${entry.haul.toLocaleString()}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {entry.titleEarned}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => onChallengeEntry(entry)}
                            className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-md bg-white/8 hover:bg-[#FF5E7E] hover:text-[#0B0D14] text-slate-200 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Race</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
