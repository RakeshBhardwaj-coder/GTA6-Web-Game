import React from 'react';
import { Volume2, VolumeX, Play, Trophy, Crown } from 'lucide-react';
import { CAR_LIST } from '../game/cars';
import { LeaderboardEntry } from '../game/leaderboard';
import { CarId, ChallengeInfo } from '../game/types';
import { CarIllustration } from './CarIllustration';

interface TitleScreenProps {
  selectedCar: CarId;
  onSelectCar: (id: CarId) => void;
  bestScore: number;
  challenge: ChallengeInfo | null;
  onClearChallenge: () => void;
  onStart: () => void;
  onOpenLeaderboard: () => void;
  topEntries: LeaderboardEntry[];
  leaderboardLoading: boolean;
  onChallengeEntry: (entry: LeaderboardEntry) => void;
  muted: boolean;
  onToggleMute: () => void;
}

const KEY_ART_URL = './src/assets/images/leonida_title_keyart_1795516402210.jpg';

export const TitleScreen: React.FC<TitleScreenProps> = ({
  selectedCar,
  onSelectCar,
  bestScore,
  challenge,
  onClearChallenge,
  onStart,
  onOpenLeaderboard,
  topEntries,
  leaderboardLoading,
  onChallengeEntry,
  muted,
  onToggleMute,
}) => {
  const topThree = topEntries.slice(0, 3);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0B0D14] text-slate-100 select-none">
      {/* Illustrated Key-Art Backdrop with CSS fallback */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-[#2B1228] via-[#1B172B] to-[#0B0D14]"
        aria-hidden="true"
      />
      <img
        src={KEY_ART_URL}
        alt="Sunset sports car speeding down Ocean Drive in Leonida"
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover object-center"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />

      {/* Balanced radial/vertical scrim for centered typography */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-[#0B0D14]/80 via-[#0B0D14]/72 to-[#0B0D14]/92"
        aria-hidden="true"
      />

      {/* Audio Mute Button (top-right corner) */}
      <button
        type="button"
        onClick={onToggleMute}
        aria-label={muted ? 'Unmute audio' : 'Mute audio'}
        className="absolute top-4 right-5 sm:top-5 sm:right-6 z-20 flex items-center justify-center w-11 h-11 rounded-lg bg-[#0B0D14]/80 border border-white/15 text-slate-200 hover:text-white hover:border-white/30 transition-colors cursor-pointer"
      >
        {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
      </button>

      {/* Full-Width Scroll Wrapper (keeps scrollbar attached to far-right edge) */}
      <div className="relative z-10 h-full w-full overflow-y-auto touch-pan-y">
        {/* Centered Content Container */}
        <div className="min-h-full w-full max-w-2xl mx-auto px-5 sm:px-8 py-5 sm:py-7 flex flex-col items-center justify-between text-center">
          <div className="w-full my-auto flex flex-col items-center space-y-5">
          {/* Bespoke Centered SVG Title Lockup */}
          <div className="w-full flex flex-col items-center">
            <div className="flex flex-wrap items-center justify-center gap-2.5 text-xs sm:text-sm font-semibold tracking-wide mb-2">
              <span className="text-[#FFB347]">A Game by Rakesh Bhardwaj</span>
              <span className="px-2.5 py-0.5 rounded bg-[#10B981]/20 border border-[#10B981]/45 text-[#34D399] font-bold tabular-nums">
                Best ${bestScore.toLocaleString()}
              </span>
            </div>

            <svg
              viewBox="0 0 540 112"
              className="w-full max-w-[430px] h-auto mx-auto drop-shadow-[0_6px_24px_rgba(0,0,0,0.7)]"
              role="img"
              aria-label="GTA6 Web Game by Rakesh Bhardwaj"
            >
              <defs>
                <linearGradient id="leonidaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFF7ED" />
                  <stop offset="52%" stopColor="#FFB347" />
                  <stop offset="100%" stopColor="#FF5E7E" />
                </linearGradient>
              </defs>
              {/* Centered sunset speed bars */}
              <rect x="82" y="96" width="170" height="4" rx="2" fill="#FF5E7E" />
              <rect x="262" y="96" width="110" height="4" rx="2" fill="#FFB347" />
              <rect x="382" y="96" width="76" height="4" rx="2" fill="#2DD4BF" />
              <text
                x="270"
                y="80"
                textAnchor="middle"
                fill="url(#leonidaGrad)"
                fontFamily="'Barlow Condensed', sans-serif"
                fontWeight="800"
                fontStyle="italic"
                fontSize="74"
                letterSpacing="1"
              >
                GTA6 WEB GAME
              </text>
            </svg>

            <p className="mt-2 text-sm sm:text-base text-slate-200 max-w-lg mx-auto leading-relaxed">
              Hit the coastal strip in a high-speed endless getaway chase created by Rakesh Bhardwaj! Dodge traffic, weave through tight gaps, smash pursuing cruisers, and launch off ramps as the heat intensifies.
            </p>
          </div>

          {/* Incoming Friend Challenge Notice */}
          {challenge && (
            <div className="w-full max-w-md mx-auto flex flex-col items-center gap-1.5 px-4 py-3 rounded-lg bg-[#161B2B]/90 border border-[#FFB347]/45 text-center">
              <p className="text-xs font-semibold text-[#FFB347]">
                Rival Challenge
              </p>
              <p className="text-sm font-semibold text-white tabular-nums">
                {challenge.targetScore
                  ? `Target to beat: $${challenge.targetScore.toLocaleString()}`
                  : 'Match this exact traffic & road run'}
              </p>
              <button
                type="button"
                onClick={onClearChallenge}
                className="text-xs font-medium text-slate-300 hover:text-white underline cursor-pointer"
              >
                Clear Challenge
              </button>
            </div>
          )}

          {/* Simplest Color-Only Car Selection */}
          <div className="w-full max-w-md mx-auto">
            <div className="text-xs font-semibold text-slate-300 tracking-wide mb-2.5 text-center">
              Select Ride
            </div>
            <div className="grid grid-cols-3 gap-3 justify-items-center">
              {CAR_LIST.map((car) => {
                const active = selectedCar === car.id;
                return (
                  <button
                    key={car.id}
                    type="button"
                    aria-label={`Select ${car.name} colored car`}
                    aria-pressed={active}
                    onClick={() => onSelectCar(car.id)}
                    className={`w-full flex flex-col items-center justify-center py-3.5 px-2 rounded-xl border transition-all duration-150 cursor-pointer ${
                      active
                        ? 'bg-[#161B2B]/95 scale-[1.03]'
                        : 'bg-[#0F131F]/80 border-white/15 hover:border-white/35'
                    }`}
                    style={
                      active
                        ? {
                            borderColor: car.bodyColor,
                            boxShadow: `0 0 0 2px ${car.bodyColor}55, 0 10px 24px rgba(0,0,0,0.45)`,
                          }
                        : undefined
                    }
                  >
                    <CarIllustration car={car} className="w-11 h-20 sm:w-12 sm:h-22" />
                    <span
                      className="mt-2 w-8 h-1.5 rounded-full transition-opacity"
                      style={{
                        backgroundColor: car.bodyColor,
                        opacity: active ? 1 : 0.45,
                      }}
                      aria-hidden="true"
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Primary Start CTA + Unique Leaderboard Trigger */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={onStart}
              className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-lg bg-[#FF5E7E] hover:bg-[#FF7490] active:translate-y-px text-[#0B0D14] font-display font-extrabold text-2xl tracking-wide transition-colors shadow-lg cursor-pointer whitespace-nowrap"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Start Run</span>
            </button>

            <button
              type="button"
              onClick={onOpenLeaderboard}
              className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-lg bg-[#131826]/90 hover:bg-[#1B2236] border border-white/15 text-slate-100 font-display font-bold text-xl tracking-wide transition-colors cursor-pointer whitespace-nowrap"
            >
              <Trophy className="w-4 h-4 text-[#FFB347]" />
              <span>Leaderboard</span>
            </button>
          </div>

          {/* Compact Centered Unique Top 3 Most Wanted Strip */}
          <div className="w-full max-w-md mx-auto rounded-xl bg-[#0B0D14]/82 border border-white/12 p-3.5 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-[#FFB347] mb-2">
              <Crown className="w-3.5 h-3.5" />
              <span>Most Wanted Top 3</span>
            </div>
            {leaderboardLoading ? (
              <div className="py-2 text-xs text-slate-400">Loading leaderboard...</div>
            ) : topThree.length === 0 ? (
              <div className="py-2 text-xs text-slate-400">
                No records yet · Be the #1 driver!
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {topThree.map((entry, idx) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => onChallengeEntry(entry)}
                    className="flex flex-col items-center justify-center p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.09] border border-white/8 transition-colors cursor-pointer min-w-0"
                    title={`Race ${entry.driverName}'s Run`}
                  >
                    <span
                      className={`font-mono-num text-[11px] font-bold ${
                        idx === 0 ? 'text-[#FFB347]' : 'text-slate-300'
                      }`}
                    >
                      #{idx + 1}
                    </span>
                    <span className="text-xs font-semibold text-white truncate w-full">
                      {entry.driverName}
                    </span>
                    <span className="font-mono-num text-xs font-bold text-[#FFB347]">
                      ${entry.haul.toLocaleString()}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Centered Control Signs Help */}
        <div className="pt-3 flex flex-col items-center justify-center gap-2 text-center">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-xs text-slate-300 text-center">
            <span>◀ ▶ / A D Left &amp; Right</span>
            <span aria-hidden="true">·</span>
            <span>▲ Boost</span>
            <span aria-hidden="true">·</span>
            <span>⎵ Space Drift</span>
            <span aria-hidden="true">·</span>
            <span>⇧ Shift Nitro</span>
            <span aria-hidden="true">·</span>
            <span>Mobile: Buttons / Swipe</span>
          </div>

          <p className="text-[11px] font-medium text-slate-400 tracking-wide">
            © 2026 Rakesh Bhardwaj · All Rights Reserved
          </p>
        </div>
        </div>
      </div>
    </div>
  );
};
