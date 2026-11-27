import React, { useState } from 'react';
import { Trophy, X, Play, Crown, Share2, Check, Home } from 'lucide-react';
import { CARS } from '../game/cars';
import { getSavedDriverTag, LeaderboardEntry } from '../game/leaderboard';
import { CarIllustration } from './CarIllustration';

interface LeaderboardModalProps {
  entries: LeaderboardEntry[];
  loading: boolean;
  errorMsg: string | null;
  highlightEntryId?: string | null;
  onClose: () => void;
  onMainMenu: () => void;
  onChallengeEntry: (entry: LeaderboardEntry) => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  entries,
  loading,
  errorMsg,
  highlightEntryId,
  onClose,
  onMainMenu,
  onChallengeEntry,
}) => {
  const [copiedShare, setCopiedShare] = useState(false);

  const topEntries = entries.slice(0, 25);
  const kingpin = topEntries[0] ?? null;
  const restEntries = topEntries.slice(1);
  const currentDriverKey = getSavedDriverTag().trim().toLowerCase();

  const handleShare = async () => {
    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    const shareText = kingpin
      ? `Check out the Global Leaderboard on GTA6 Web Game! #1 Winner ${kingpin.driverName} scored $${kingpin.haul.toLocaleString()} (${(kingpin.distanceMeters / 1000).toFixed(2)} km)!`
      : 'Race on the Global Leaderboard in GTA6 Web Game by Rakesh Bhardwaj!';
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'GTA6 Web Game — Global Leaderboard',
          text: shareText,
          url: baseUrl,
        });
        return;
      } catch {
        // User canceled or share unsupported, fallback to copy
      }
    }
    try {
      await navigator.clipboard.writeText(`${shareText} ${baseUrl}`);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2200);
    } catch {
      // ignore restricted clipboard
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center bg-[#0B0D14]/90 p-3 sm:p-4 overflow-y-auto touch-pan-y text-center">
      <div className="w-full max-w-lg rounded-xl bg-[#131826] border border-white/12 p-4 sm:p-6 shadow-2xl my-auto max-h-[92vh] flex flex-col text-center">
        {/* Centered Header: Game Title + Global Leaderboard text */}
        <div className="relative flex flex-col items-center pb-3.5 border-b border-white/10">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close leaderboard"
            className="absolute top-0 right-0 flex items-center justify-center w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-9 h-9 rounded-lg bg-[#FFB347]/15 border border-[#FFB347]/35 flex items-center justify-center text-[#FFB347] mb-1.5">
            <Trophy className="w-4 h-4" />
          </div>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-white leading-none">
            GTA6 Web Game
          </h2>
          <p className="mt-1 text-xs sm:text-sm font-semibold text-[#FFB347] tracking-wide">
            Global Leaderboard
          </p>
        </div>

        {/* Error Message */}
        {errorMsg && (
          <div className="mt-3 px-3.5 py-2.5 rounded-lg bg-[#EF4444]/15 border border-[#EF4444]/40 text-xs text-[#FCA5A5] break-words text-center">
            {errorMsg}
          </div>
        )}

        {/* Scrollable Board */}
        <div className="mt-3.5 flex-1 overflow-y-auto touch-pan-y overscroll-contain min-h-[200px] space-y-3">
          {loading ? (
            <div className="py-14 text-center text-sm text-slate-400">
              Loading Global Leaderboard...
            </div>
          ) : topEntries.length === 0 ? (
            <div className="py-14 text-center">
              <p className="text-sm font-medium text-slate-300">
                No scores posted yet.
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Finish a run and save your score to become the #1 Winner.
              </p>
            </div>
          ) : (
            <>
              {/* #1 Winner Card: Player 1 Winner, #1, Dollar, Km, Challenge Btn */}
              {kingpin && (
                <div
                  className={`rounded-xl p-4 border text-center flex flex-col items-center gap-2 ${
                    highlightEntryId === kingpin.id
                      ? 'bg-[#FFB347]/18 border-[#FFB347]'
                      : 'bg-gradient-to-b from-[#FFB347]/14 to-[#0B0D14]/70 border-[#FFB347]/45'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-[#FFB347] tracking-wide uppercase">
                    <Crown className="w-4 h-4" />
                    <span>#1 Winner</span>
                  </div>

                  <div className="flex items-center justify-center gap-2.5">
                    <CarIllustration
                      car={CARS[kingpin.carId] ?? CARS.cheetah}
                      className="w-6 h-10 shrink-0"
                    />
                    <span className="font-display font-extrabold text-2xl sm:text-3xl text-white leading-tight truncate max-w-[230px]">
                      {kingpin.driverName}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-center gap-3">
                    <span className="font-display font-extrabold text-3xl sm:text-4xl text-[#FFB347] leading-none tabular-nums">
                      ${kingpin.haul.toLocaleString()}
                    </span>
                    <span className="text-slate-500" aria-hidden="true">·</span>
                    <span className="font-mono-num text-sm sm:text-base font-bold text-[#38BDF8] tabular-nums">
                      {(kingpin.distanceMeters / 1000).toFixed(2)} km
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onChallengeEntry(kingpin)}
                    className="mt-1 inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-lg bg-[#FF5E7E] hover:bg-[#FF7490] text-[#0B0D14] text-xs sm:text-sm font-bold transition-colors cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Challenge</span>
                  </button>
                </div>
              )}

              {/* Remaining Ranked Players (#2+) */}
              {restEntries.length > 0 && (
                <div className="divide-y divide-white/8">
                  {restEntries.map((entry, idx) => {
                    const rank = idx + 2;
                    const isLocalDriver =
                      currentDriverKey.length > 0 &&
                      entry.driverName.trim().toLowerCase() === currentDriverKey;
                    const isHighlighted = highlightEntryId === entry.id;
                    const car = CARS[entry.carId] ?? CARS.cheetah;
                    return (
                      <div
                        key={entry.id}
                        className={`flex items-center justify-between gap-2 py-2.5 px-2.5 rounded-lg text-center ${
                          isHighlighted
                            ? 'bg-[#FFB347]/15 border border-[#FFB347]/40'
                            : isLocalDriver
                            ? 'bg-white/[0.04]'
                            : ''
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span
                            className={`font-mono-num text-xs font-bold w-7 shrink-0 text-center ${
                              rank === 2
                                ? 'text-slate-200'
                                : rank === 3
                                ? 'text-[#FB923C]'
                                : 'text-slate-400'
                            }`}
                          >
                            #{rank}
                          </span>

                          <CarIllustration car={car} className="w-4 h-7 shrink-0" />

                          <div className="min-w-0 text-left">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-xs sm:text-sm text-white truncate">
                                {entry.driverName}
                              </span>
                              {isLocalDriver && (
                                <span className="text-[10px] font-semibold text-[#2DD4BF] shrink-0">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] font-mono-num">
                              <span className="font-bold text-[#FFB347]">
                                ${entry.haul.toLocaleString()}
                              </span>
                              <span className="text-slate-500" aria-hidden="true">·</span>
                              <span className="text-[#38BDF8]">
                                {(entry.distanceMeters / 1000).toFixed(2)} km
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onChallengeEntry(entry)}
                          className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-md bg-white/8 hover:bg-[#FF5E7E] hover:text-[#0B0D14] text-slate-200 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Challenge</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Bottom 3 Buttons: Leaderboard (Unclickable), Share, Main Menu */}
        <div className="mt-4 pt-3.5 border-t border-white/10 grid grid-cols-3 gap-2">
          <button
            type="button"
            disabled
            aria-current="page"
            className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg bg-[#FFB347]/15 border border-[#FFB347]/45 text-[#FFB347] font-semibold text-xs sm:text-sm opacity-75 cursor-default pointer-events-none whitespace-nowrap"
          >
            <Crown className="w-4 h-4 shrink-0" />
            <span>Leaderboard</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg bg-[#2DD4BF]/18 hover:bg-[#2DD4BF]/28 border border-[#2DD4BF]/40 text-[#2DD4BF] font-semibold text-xs sm:text-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            {copiedShare ? (
              <Check className="w-4 h-4 shrink-0" />
            ) : (
              <Share2 className="w-4 h-4 shrink-0" />
            )}
            <span>{copiedShare ? 'Copied' : 'Share'}</span>
          </button>

          <button
            type="button"
            onClick={onMainMenu}
            className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg bg-white/8 hover:bg-white/14 border border-white/12 text-slate-200 font-semibold text-xs sm:text-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            <Home className="w-4 h-4 shrink-0" />
            <span>Main Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
