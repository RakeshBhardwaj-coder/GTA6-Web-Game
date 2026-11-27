import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  RotateCcw,
  Share2,
  Check,
  Home,
  Trophy,
  Crown,
  Gauge,
  Flame,
  Sparkles,
  Gift,
  Award,
  Hash,
} from 'lucide-react';
import { requestRewardedAd } from '../game/crazygames';
import {
  DRIVER_NAME_MAX,
  getSavedDriverTag,
  LeaderboardEntry,
  sanitizeDriverName,
  submitScoreToLeaderboard,
} from '../game/leaderboard';
import { RunSummary } from '../game/types';

interface EndModalProps {
  summary: RunSummary;
  entries: LeaderboardEntry[];
  leaderboardLoading: boolean;
  leaderboardError: string | null;
  onPlayAgain: () => void;
  onRevive: () => void;
  onBonusCoinsAdded?: (amount: number) => void;
  onCelebrate?: (rank: 1 | 2 | 3) => void;
  onOpenLeaderboard: () => void;
  onBackToTitle: () => void;
}

const RIBBON_PALETTES: Record<1 | 2 | 3, string[]> = {
  1: ['#FFB347', '#FDE047', '#FF5E7E', '#2DD4BF', '#38BDF8', '#A78BFA'],
  2: ['#E2E8F0', '#38BDF8', '#2DD4BF', '#FF5E7E', '#C4B5FD', '#FDE047'],
  3: ['#FB923C', '#FBBF24', '#FF5E7E', '#34D399', '#38BDF8', '#A78BFA'],
};

interface RibbonSpec {
  id: number;
  leftPct: number;
  delaySec: number;
  durationSec: number;
  swayPx: number;
  rotMid: number;
  rotLate: number;
  rotEnd: number;
  variant: 'curl' | 'wave' | 'strip';
  scale: number;
}

const RIBBON_SPECS: RibbonSpec[] = Array.from({ length: 22 }, (_, i) => {
  const leftPct = 3 + (i * 93) / 21;
  const variants: Array<'curl' | 'wave' | 'strip'> = ['curl', 'wave', 'strip'];
  return {
    id: i,
    leftPct,
    delaySec: (i % 7) * 0.38,
    durationSec: 3.4 + (i % 5) * 0.48,
    swayPx: (i % 2 === 0 ? 1 : -1) * (14 + (i % 4) * 6),
    rotMid: (i % 2 === 0 ? 1 : -1) * (95 + (i % 3) * 35),
    rotLate: (i % 2 === 0 ? 1 : -1) * (220 + (i % 4) * 30),
    rotEnd: (i % 2 === 0 ? 1 : -1) * (360 + (i % 3) * 45),
    variant: variants[i % variants.length],
    scale: 0.82 + (i % 3) * 0.16,
  };
});

const CelebrationRibbons: React.FC<{ rank: 1 | 2 | 3 }> = ({ rank }) => {
  const palette = RIBBON_PALETTES[rank];

  return (
    <div
      className="pointer-events-none fixed inset-0 z-40 overflow-hidden"
      aria-hidden="true"
    >
      {RIBBON_SPECS.map((r) => {
        const color = palette[r.id % palette.length];
        const accent = palette[(r.id + 2) % palette.length];
        const style = {
          left: `${r.leftPct}%`,
          top: '-48px',
          '--fall-delay': `${r.delaySec}s`,
          '--fall-dur': `${r.durationSec}s`,
          '--sway-x': `${r.swayPx}px`,
          '--sway-end': `${-r.swayPx * 0.5}px`,
          '--rot-mid': `${r.rotMid}deg`,
          '--rot-late': `${r.rotLate}deg`,
          '--rot-end': `${r.rotEnd}deg`,
        } as React.CSSProperties;

        return (
          <div key={r.id} className="absolute animate-ribbon-fall" style={style}>
            {r.variant === 'curl' ? (
              <svg
                width={Math.round(22 * r.scale)}
                height={Math.round(44 * r.scale)}
                viewBox="0 0 24 48"
                fill="none"
              >
                <path
                  d="M12 2C19 7 5 14 14 21C22 27 4 34 13 42C16 44.5 14 47 11 47"
                  stroke={color}
                  strokeWidth="4.2"
                  strokeLinecap="round"
                />
                <path
                  d="M12 2C19 7 5 14 14 21C22 27 4 34 13 42"
                  stroke={accent}
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeOpacity="0.65"
                />
              </svg>
            ) : r.variant === 'wave' ? (
              <svg
                width={Math.round(20 * r.scale)}
                height={Math.round(40 * r.scale)}
                viewBox="0 0 20 40"
                fill="none"
              >
                <path
                  d="M4 2Q18 10 10 20T14 38"
                  stroke={color}
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <div
                className="rounded-sm shadow-sm"
                style={{
                  width: `${Math.round(9 * r.scale)}px`,
                  height: `${Math.round(24 * r.scale)}px`,
                  background: `linear-gradient(135deg, ${color}, ${accent})`,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

const LOW_RUN_HEADLINES: Array<{
  headline: string;
  color: string;
  textClass: string;
}> = [
  {
    headline: 'Thanks for Driving! Awesome Effort!',
    color: '#2DD4BF',
    textClass: 'font-display italic font-extrabold text-xl sm:text-2xl tracking-wide',
  },
  {
    headline: 'Great Run! Keep Rolling!',
    color: '#34D399',
    textClass: 'font-display font-extrabold text-xl sm:text-2xl tracking-wide',
  },
  {
    headline: 'Bold Drive! Well Played!',
    color: '#FFB347',
    textClass: 'font-display italic font-extrabold text-xl sm:text-2xl tracking-wide',
  },
  {
    headline: 'Awesome Spirit! Play Again!',
    color: '#38BDF8',
    textClass: 'font-display font-extrabold text-xl sm:text-2xl tracking-wide',
  },
];

function getRunPraise(summary: RunSummary): {
  headline: string;
  color: string;
  textClass: string;
} {
  const score = summary.haul;
  if (score >= 45000 || summary.peakStars >= 5) {
    return {
      headline: 'Legendary Run! Thank You for Playing!',
      color: '#FFB347',
      textClass: 'font-display italic font-extrabold text-xl sm:text-2xl tracking-wide',
    };
  }
  if (score >= 22000 || summary.copsWrecked >= 5) {
    return {
      headline: 'Awesome Mastery! Great Driving!',
      color: '#FF5E7E',
      textClass: 'font-display font-extrabold text-xl sm:text-2xl tracking-wide',
    };
  }
  if (score >= 10000 || summary.nearMisses >= 6) {
    return {
      headline: 'Great Driving! Thanks for Playing!',
      color: '#2DD4BF',
      textClass: 'font-display italic font-bold text-xl sm:text-2xl tracking-wide',
    };
  }
  if (score >= 3000 || summary.distanceMeters >= 500) {
    return {
      headline: 'Good Run! Well Played!',
      color: '#34D399',
      textClass: 'font-display font-extrabold text-xl sm:text-2xl tracking-wide',
    };
  }
  const idx =
    Math.abs(summary.haul + summary.distanceMeters + summary.copsWrecked + summary.nearMisses) %
    LOW_RUN_HEADLINES.length;
  return LOW_RUN_HEADLINES[idx];
}

export const EndModal: React.FC<EndModalProps> = ({
  summary,
  entries,
  leaderboardLoading,
  onPlayAgain,
  onRevive,
  onBonusCoinsAdded,
  onCelebrate,
  onOpenLeaderboard,
  onBackToTitle,
}) => {
  const [copiedShare, setCopiedShare] = useState(false);
  const [driverTag, setDriverTag] = useState<string>(() => getSavedDriverTag());
  const [savingScore, setSavingScore] = useState(false);
  const [savedEntryId, setSavedEntryId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [bonusCoins, setBonusCoins] = useState(0);
  const effectiveHaul = summary.haul + bonusCoins;
  const [displayHaul, setDisplayHaul] = useState<number>(effectiveHaul > 0 ? 1 : 0);
  const [reviving, setReviving] = useState(false);
  const [watchingBonusAd, setWatchingBonusAd] = useState(false);
  const isMountedRef = useRef(true);
  const celebratedRankRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const effectiveSummary = useMemo<RunSummary>(
    () => ({ ...summary, haul: effectiveHaul }),
    [summary, effectiveHaul]
  );

  const handleReviveClick = () => {
    if (reviving || watchingBonusAd) return;
    setReviving(true);
    void requestRewardedAd(
      () => {
        if (isMountedRef.current) {
          setReviving(false);
        }
        onRevive();
      },
      () => {
        if (isMountedRef.current) {
          setReviving(false);
        }
      }
    );
  };

  const handleBonusCoinsClick = () => {
    if (watchingBonusAd || reviving) return;
    setWatchingBonusAd(true);
    void requestRewardedAd(
      () => {
        if (isMountedRef.current) {
          setWatchingBonusAd(false);
          setBonusCoins((prev) => prev + 500);
        }
        onBonusCoinsAdded?.(500);
      },
      () => {
        if (isMountedRef.current) {
          setWatchingBonusAd(false);
        }
      }
    );
  };

  // Smooth score count-up
  useEffect(() => {
    const target = effectiveHaul;
    if (target <= 1) {
      setDisplayHaul(target);
      return;
    }

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setDisplayHaul(target);
      return;
    }

    const startVal = bonusCoins > 0 ? Math.max(1, target - 500) : 1;
    const duration = bonusCoins > 0 ? 450 : 850;
    const startTime = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayHaul(Math.round(startVal + (target - startVal) * eased));
      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [effectiveHaul, bonusCoins]);

  const praise = useMemo(() => getRunPraise(effectiveSummary), [effectiveSummary]);

  const projectedRank = useMemo(() => {
    const beaten = entries.filter((e) => e.haul > effectiveHaul).length;
    return beaten + 1;
  }, [entries, effectiveHaul]);

  const savedDriverRank = useMemo(() => {
    if (!savedEntryId) return null;
    const key = driverTag.trim().toLowerCase();
    const idx = entries.findIndex(
      (e) => e.id === savedEntryId || (key && e.driverName.trim().toLowerCase() === key)
    );
    return idx >= 0 ? idx + 1 : projectedRank;
  }, [entries, savedEntryId, driverTag, projectedRank]);

  const displayRank = savedDriverRank ?? projectedRank;
  const isPodiumWinner = displayRank >= 1 && displayRank <= 3;
  const podiumRank = isPodiumWinner ? (displayRank as 1 | 2 | 3) : null;

  useEffect(() => {
    if (!leaderboardLoading && podiumRank && celebratedRankRef.current !== podiumRank) {
      celebratedRankRef.current = podiumRank;
      onCelebrate?.(podiumRank);
    }
  }, [leaderboardLoading, podiumRank, onCelebrate]);

  const normalizedInputKey = driverTag.trim().toLowerCase();

  const existingDriverBest = useMemo(() => {
    if (!normalizedInputKey) return null;
    return (
      entries.find((e) => e.driverName.trim().toLowerCase() === normalizedInputKey) ?? null
    );
  }, [normalizedInputKey, entries]);

  const handleSaveScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingScore || savedEntryId) return;
    const resolvedName = sanitizeDriverName(driverTag);
    setDriverTag(resolvedName);
    setSavingScore(true);
    setSaveError(null);
    try {
      const entryId = await submitScoreToLeaderboard(effectiveSummary, resolvedName);
      setSavedEntryId(entryId);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save score.');
    } finally {
      setSavingScore(false);
    }
  };

  const handleShare = async () => {
    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    const shareText = `I scored $${effectiveHaul.toLocaleString()} (Position #${displayRank}) in GTA6 Web Game by Rakesh Bhardwaj!`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'GTA6 Web Game — by Rakesh Bhardwaj',
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

  const podiumBannerConfig =
    podiumRank === 1
      ? {
          title: '1st Place Champion!',
          color: '#FFB347',
          bgClass:
            'bg-gradient-to-r from-[#FFB347]/22 via-[#FDE047]/16 to-[#FF5E7E]/20 border-[#FFB347]/55',
        }
      : podiumRank === 2
      ? {
          title: '2nd Place Podium!',
          color: '#38BDF8',
          bgClass:
            'bg-gradient-to-r from-[#E2E8F0]/18 via-[#38BDF8]/18 to-[#2DD4BF]/18 border-[#38BDF8]/55',
        }
      : podiumRank === 3
      ? {
          title: '3rd Place Podium!',
          color: '#FB923C',
          bgClass:
            'bg-gradient-to-r from-[#FB923C]/22 via-[#FBBF24]/16 to-[#FF5E7E]/18 border-[#FB923C]/55',
        }
      : null;

  return (
    <div className="fixed inset-0 z-30 flex flex-col items-center bg-[#0B0D14]/86 p-3 sm:p-5 overflow-y-auto touch-pan-y text-center animate-gameover-fade">
      {/* Colorful Celebration Ribbons for 1st - 3rd Podium Finish */}
      {!leaderboardLoading && podiumRank && <CelebrationRibbons rank={podiumRank} />}

      <div className="relative z-10 w-full max-w-md rounded-xl bg-[#131826] border border-white/12 p-4 sm:p-5 shadow-2xl my-auto text-center">
        {/* 1. Top: Podium Crest (1st-3rd) & Gratitude Headline */}
        {!leaderboardLoading && podiumBannerConfig && (
          <div
            className={`mb-2 mx-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-1 rounded-lg border animate-podium-pop ${podiumBannerConfig.bgClass}`}
          >
            <Award className="w-4 h-4 shrink-0" style={{ color: podiumBannerConfig.color }} />
            <span
              className="font-display font-extrabold text-sm sm:text-base tracking-wide uppercase"
              style={{ color: podiumBannerConfig.color }}
            >
              {podiumBannerConfig.title}
            </span>
          </div>
        )}

        <div
          className={`animate-text-bounce ${praise.textClass}`}
          style={{ color: praise.color }}
        >
          {praise.headline}
        </div>

        {/* 2. Score Rectangular Box */}
        <div className="mt-2.5 rounded-lg bg-[#0B0D14]/85 border border-[#FFB347]/35 px-4 py-3 text-center">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Total Score
          </div>
          <div className="mt-0.5 font-display font-extrabold text-4xl sm:text-5xl leading-none text-[#FFB347] tabular-nums">
            ${displayHaul.toLocaleString()}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2 text-xs font-medium">
            <span className="text-[#FCA5A5]">{summary.killedBy}</span>
            {summary.isNewBest && (
              <>
                <span className="text-slate-500" aria-hidden="true">·</span>
                <span className="text-[#FFB347] font-semibold">New Best</span>
              </>
            )}
            {bonusCoins > 0 && (
              <>
                <span className="text-slate-500" aria-hidden="true">·</span>
                <span className="text-[#34D399] font-semibold tabular-nums">
                  +${bonusCoins.toLocaleString()} Added
                </span>
              </>
            )}
          </div>
        </div>

        {/* 3. Four Clean Stat Boxes (Position, Distance, Cop Kills, Misses — Combo removed) */}
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="rounded-lg bg-[#0B0D14]/75 border border-white/10 px-2.5 py-2 flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-[#2DD4BF]">
              <Hash className="w-3.5 h-3.5 shrink-0" />
              <span>Position</span>
            </div>
            <div className="mt-0.5 font-display font-extrabold text-xl leading-tight text-white tabular-nums">
              #{displayRank}
            </div>
          </div>

          <div className="rounded-lg bg-[#0B0D14]/75 border border-white/10 px-2.5 py-2 flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-[#38BDF8]">
              <Gauge className="w-3.5 h-3.5 shrink-0" />
              <span>Distance</span>
            </div>
            <div className="mt-0.5 font-display font-extrabold text-xl leading-tight text-white tabular-nums">
              {summary.distanceMeters.toLocaleString()}m
            </div>
          </div>

          <div className="rounded-lg bg-[#0B0D14]/75 border border-white/10 px-2.5 py-2 flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-[#FF5E7E]">
              <Flame className="w-3.5 h-3.5 shrink-0" />
              <span>Cop Kills</span>
            </div>
            <div className="mt-0.5 font-display font-extrabold text-xl leading-tight text-white tabular-nums">
              {summary.copsWrecked}
            </div>
          </div>

          <div className="rounded-lg bg-[#0B0D14]/75 border border-white/10 px-2.5 py-2 flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-[#FFB347]">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>Misses</span>
            </div>
            <div className="mt-0.5 font-display font-extrabold text-xl leading-tight text-white tabular-nums">
              {summary.nearMisses}
            </div>
          </div>
        </div>

        {/* 4. Enter Player Name + Save Button Side-by-Side */}
        <div className="mt-3 pt-3 border-t border-white/10">
          {savedEntryId ? (
            <div className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#10B981]/14 border border-[#10B981]/35 text-xs sm:text-sm font-semibold text-[#34D399]">
              <Check className="w-4 h-4 shrink-0" />
              <span>
                {existingDriverBest && existingDriverBest.haul > effectiveHaul
                  ? `Saved! ${driverTag} holds Position #${displayRank} ($${existingDriverBest.haul.toLocaleString()})`
                  : `Saved! ${driverTag} · Position #${displayRank}`}
              </span>
            </div>
          ) : (
            <form
              onSubmit={handleSaveScore}
              className="flex items-center justify-center gap-2"
            >
              <label htmlFor="driver-tag-input" className="sr-only">
                Player name
              </label>
              <input
                id="driver-tag-input"
                type="text"
                value={driverTag}
                maxLength={DRIVER_NAME_MAX}
                onChange={(e) => setDriverTag(e.target.value)}
                placeholder="Player name"
                className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-[#0B0D14] border border-white/15 focus:border-[#FFB347] focus:outline-none text-sm text-white placeholder:text-slate-500"
              />
              <button
                type="submit"
                disabled={savingScore}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#FFB347] hover:bg-[#FFC266] disabled:opacity-60 text-[#0B0D14] font-bold text-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Trophy className="w-4 h-4" />
                <span>{savingScore ? 'Saving...' : 'Save'}</span>
              </button>
            </form>
          )}

          {saveError && (
            <p className="mt-1.5 text-xs text-[#FCA5A5]">{saveError}</p>
          )}
        </div>

        {/* 5. Below: 2 Boxes (Watch Ad +$500 & Revive) */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={reviving || watchingBonusAd}
            onClick={handleBonusCoinsClick}
            className="flex items-center justify-center gap-1.5 py-2.5 px-2.5 rounded-lg bg-[#FBBF24] hover:bg-[#FDE047] disabled:opacity-60 text-[#0B0D14] font-display font-extrabold text-sm sm:text-base tracking-wide transition-colors cursor-pointer shadow-md whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>
              {watchingBonusAd
                ? 'Loading Ad...'
                : bonusCoins > 0
                ? `+$${bonusCoins} Added (+$500)`
                : 'Watch Ad +$500'}
            </span>
          </button>

          <button
            type="button"
            disabled={reviving || watchingBonusAd}
            onClick={handleReviveClick}
            className="flex items-center justify-center gap-1.5 py-2.5 px-2.5 rounded-lg bg-[#38BDF8] hover:bg-[#7DD3FC] disabled:opacity-60 text-[#0B0D14] font-display font-extrabold text-sm sm:text-base tracking-wide transition-colors cursor-pointer shadow-md whitespace-nowrap"
          >
            <Gift className="w-4 h-4 shrink-0" />
            <span>{reviving ? 'Loading Ad...' : 'Revive'}</span>
          </button>
        </div>

        {/* 6. Below: Play Again Button */}
        <button
          type="button"
          onClick={onPlayAgain}
          className="mt-2.5 w-full flex items-center justify-center gap-2 py-2.5 px-5 rounded-lg bg-[#FF5E7E] hover:bg-[#FF7490] text-[#0B0D14] font-display font-extrabold text-lg tracking-wide transition-colors cursor-pointer shadow-md whitespace-nowrap"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Play Again</span>
        </button>

        {/* 7. Below: 3 Boxes (Leaderboard with icon, Share with icon, Main Menu with icon) */}
        <div className="mt-2.5 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={onOpenLeaderboard}
            className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg bg-[#0B0D14]/80 hover:bg-[#1B2236] border border-white/15 text-[#FFB347] font-semibold text-xs sm:text-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            <Crown className="w-4 h-4 shrink-0" />
            <span>Leaderboard</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg bg-[#2DD4BF]/18 hover:bg-[#2DD4BF]/28 border border-[#2DD4BF]/40 text-[#2DD4BF] font-semibold text-xs sm:text-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            {copiedShare ? <Check className="w-4 h-4 shrink-0" /> : <Share2 className="w-4 h-4 shrink-0" />}
            <span>{copiedShare ? 'Copied' : 'Share'}</span>
          </button>

          <button
            type="button"
            onClick={onBackToTitle}
            className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg bg-white/8 hover:bg-white/14 border border-white/12 text-slate-200 font-semibold text-xs sm:text-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            <Home className="w-4 h-4 shrink-0" />
            <span>Main Menu</span>
          </button>
        </div>

        <p className="mt-3 text-[11px] text-slate-400">
          © 2026 Rakesh Bhardwaj · All Rights Reserved
        </p>
      </div>
    </div>
  );
};
