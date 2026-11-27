import React, { useEffect, useMemo, useState } from 'react';
import {
  RotateCcw,
  Share2,
  Check,
  Home,
  Trophy,
  Crown,
  Gauge,
  Flame,
  Zap,
  Sparkles,
} from 'lucide-react';
import { CARS } from '../game/cars';
import {
  DRIVER_NAME_MAX,
  getSavedDriverTag,
  LeaderboardEntry,
  sanitizeDriverName,
  submitScoreToLeaderboard,
} from '../game/leaderboard';
import { RunSummary } from '../game/types';
import { CarIllustration } from './CarIllustration';

interface EndModalProps {
  summary: RunSummary;
  entries: LeaderboardEntry[];
  leaderboardLoading: boolean;
  leaderboardError: string | null;
  onPlayAgain: () => void;
  onBackToTitle: () => void;
}

const LOW_RUN_HEADLINES: Array<{
  headline: string;
  color: string;
  textClass: string;
}> = [
  {
    headline: 'Awesome Effort!',
    color: '#2DD4BF',
    textClass: 'font-display italic font-extrabold text-2xl tracking-wider',
  },
  {
    headline: 'Great Spirit!',
    color: '#34D399',
    textClass: 'font-display font-extrabold text-2xl tracking-wide uppercase',
  },
  {
    headline: 'Wow, Bold Drive!',
    color: '#FFB347',
    textClass: 'font-display italic font-extrabold text-2xl tracking-wide',
  },
  {
    headline: 'Good Try! Keep Rolling!',
    color: '#38BDF8',
    textClass: 'font-sans font-extrabold text-xl tracking-tight',
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
      headline: 'Wow! Legendary Run!',
      color: '#FFB347',
      textClass: 'font-display italic font-extrabold text-2xl tracking-wider uppercase',
    };
  }
  if (score >= 22000 || summary.maxCombo >= 8) {
    return {
      headline: 'Awesome! Pure Mastery!',
      color: '#FF5E7E',
      textClass: 'font-display font-extrabold text-2xl tracking-wide',
    };
  }
  if (score >= 10000 || summary.nearMisses >= 6) {
    return {
      headline: 'Great Driving!',
      color: '#2DD4BF',
      textClass: 'font-display italic font-bold text-2xl tracking-wide',
    };
  }
  if (score >= 3000 || summary.distanceMeters >= 500) {
    return {
      headline: 'Good Run!',
      color: '#34D399',
      textClass: 'font-display font-extrabold text-xl tracking-wide',
    };
  }
  const idx =
    Math.abs(summary.haul + summary.distanceMeters + summary.copsWrecked + summary.nearMisses) %
    LOW_RUN_HEADLINES.length;
  return LOW_RUN_HEADLINES[idx];
}

function getMetricBadge(
  kind: 'dist' | 'cops' | 'misses' | 'combo',
  value: number
): { label: string; badgeClass: string } {
  if (kind === 'dist') {
    if (value >= 3000) return { label: 'Unstoppable!', badgeClass: 'italic uppercase tracking-wider' };
    if (value >= 1500) return { label: 'Awesome!', badgeClass: 'font-extrabold tracking-wide' };
    if (value >= 800) return { label: 'Great!', badgeClass: 'italic font-bold' };
    return { label: 'Good Start!', badgeClass: 'font-bold' };
  }
  if (kind === 'cops') {
    if (value >= 6) return { label: 'Wow!', badgeClass: 'italic uppercase tracking-wider' };
    if (value >= 3) return { label: 'Awesome!', badgeClass: 'font-extrabold tracking-wide' };
    if (value >= 1) return { label: 'Great!', badgeClass: 'italic font-bold' };
    return { label: 'Safe Cruise!', badgeClass: 'font-bold' };
  }
  if (kind === 'misses') {
    if (value >= 12) return { label: 'Insane!', badgeClass: 'italic uppercase tracking-wider' };
    if (value >= 6) return { label: 'Awesome!', badgeClass: 'font-extrabold tracking-wide' };
    if (value >= 2) return { label: 'Great!', badgeClass: 'italic font-bold' };
    return { label: 'Steady!', badgeClass: 'font-bold' };
  }
  if (value >= 8) return { label: 'On Fire!', badgeClass: 'italic uppercase tracking-wider' };
  if (value >= 5) return { label: 'Awesome!', badgeClass: 'font-extrabold tracking-wide' };
  if (value >= 3) return { label: 'Great!', badgeClass: 'italic font-bold' };
  return { label: 'Warm-Up!', badgeClass: 'font-bold' };
}

export const EndModal: React.FC<EndModalProps> = ({
  summary,
  entries,
  leaderboardLoading,
  leaderboardError,
  onPlayAgain,
  onBackToTitle,
}) => {
  const [copiedShare, setCopiedShare] = useState(false);
  const [driverTag, setDriverTag] = useState<string>(() => getSavedDriverTag());
  const [savingScore, setSavingScore] = useState(false);
  const [savedEntryId, setSavedEntryId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [displayHaul, setDisplayHaul] = useState<number>(summary.haul > 0 ? 1 : 0);

  // Smooth score count-up from $1 to final haul
  useEffect(() => {
    const target = summary.haul;
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

    const startVal = 1;
    const duration = 950;
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
  }, [summary.haul]);

  const praise = useMemo(() => getRunPraise(summary), [summary]);

  const achievements = useMemo(
    () => [
      {
        id: 'dist',
        icon: Gauge,
        value: `${(summary.distanceMeters / 1000).toFixed(2)} km`,
        label: 'Distance',
        badge: getMetricBadge('dist', summary.distanceMeters),
        accent: '#38BDF8',
        delayMs: 180,
      },
      {
        id: 'cops',
        icon: Flame,
        value: `${summary.copsWrecked}`,
        label: summary.copsWrecked === 1 ? 'Cop Kill' : 'Cops Kills',
        badge: getMetricBadge('cops', summary.copsWrecked),
        accent: '#FF5E7E',
        delayMs: 420,
      },
      {
        id: 'misses',
        icon: Sparkles,
        value: `${summary.nearMisses}`,
        label: summary.nearMisses === 1 ? 'Near Miss' : 'Near Misses',
        badge: getMetricBadge('misses', summary.nearMisses),
        accent: '#2DD4BF',
        delayMs: 660,
      },
      {
        id: 'combo',
        icon: Zap,
        value: `${summary.maxCombo}x`,
        label: 'Max Combo',
        badge: getMetricBadge('combo', summary.maxCombo),
        accent: '#FFB347',
        delayMs: 900,
      },
    ],
    [summary]
  );

  const projectedRank = useMemo(() => {
    const beaten = entries.filter((e) => e.haul > summary.haul).length;
    return beaten + 1;
  }, [entries, summary.haul]);

  const savedDriverRank = useMemo(() => {
    if (!savedEntryId) return null;
    const key = driverTag.trim().toLowerCase();
    const idx = entries.findIndex(
      (e) => e.id === savedEntryId || (key && e.driverName.trim().toLowerCase() === key)
    );
    return idx >= 0 ? idx + 1 : projectedRank;
  }, [entries, savedEntryId, driverTag, projectedRank]);

  const displayRank = savedDriverRank ?? projectedRank;
  const visibleBoard = entries;
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
      const entryId = await submitScoreToLeaderboard(summary, resolvedName);
      setSavedEntryId(entryId);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save score.');
    } finally {
      setSavingScore(false);
    }
  };

  const handleShare = async () => {
    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    const shareText = `I scored $${summary.haul.toLocaleString()} (Position #${displayRank}) in Leonida Run by Rakesh Bhardwaj!`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Leonida Run — by Rakesh Bhardwaj',
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

  const car = CARS[summary.carId];

  return (
    <div className="fixed inset-0 z-30 flex flex-col items-center bg-[#0B0D14]/86 p-4 overflow-y-auto touch-pan-y text-center animate-gameover-fade">
      <div className="w-full max-w-lg rounded-xl bg-[#131826] border border-white/12 p-5 sm:p-6 shadow-2xl my-auto text-center">
        {/* Animated Score Hero & Praise */}
        <div className="flex flex-col items-center">
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-slate-300">
            <CarIllustration car={car} className="w-4 h-7" />
            <span className="text-[#2DD4BF] font-semibold tabular-nums">
              Position #{displayRank}
            </span>
            {summary.isNewBest && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-[#FFB347] font-semibold">New Best</span>
              </>
            )}
          </div>

          <div
            className={`mt-1.5 animate-text-bounce ${praise.textClass}`}
            style={{ color: praise.color }}
          >
            {praise.headline}
          </div>

          <div className="mt-1 font-display font-extrabold text-5xl sm:text-6xl leading-none text-[#FFB347] tabular-nums">
            ${displayHaul.toLocaleString()}
          </div>

          <p
            className="mt-1.5 text-xs sm:text-sm font-semibold text-[#FCA5A5] animate-gratitude-fade"
            style={{ animationDelay: '220ms' }}
          >
            {summary.killedBy}
          </p>
        </div>

        {/* Sequential Staggered Achievement Pop-In Strip */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {achievements.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="rounded-lg bg-[#0B0D14]/75 border border-white/10 px-2.5 py-2 flex flex-col items-center justify-center text-center animate-achievement-pop"
                style={{ animationDelay: `${item.delayMs}ms` }}
              >
                <div
                  className={`flex items-center justify-center gap-1 text-[11px] ${item.badge.badgeClass}`}
                  style={{ color: item.accent }}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.badge.label}</span>
                </div>
                <div className="mt-0.5 font-display font-extrabold text-xl leading-tight text-white tabular-nums">
                  {item.value}
                </div>
                <div className="text-[11px] text-slate-400">{item.label}</div>
              </div>
            );
          })}
        </div>

        {/* Save Name & Position to Public Leaderboard */}
        <div className="mt-4 pt-4 border-t border-white/10">
          {savedEntryId ? (
            <div className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#10B981]/14 border border-[#10B981]/35 text-xs sm:text-sm font-semibold text-[#34D399]">
              <Check className="w-4 h-4 shrink-0" />
              <span>
                {existingDriverBest && existingDriverBest.haul > summary.haul
                  ? `Saved! ${driverTag} holds Position #${displayRank} ($${existingDriverBest.haul.toLocaleString()})`
                  : `Saved! ${driverTag} · Position #${displayRank}`}
              </span>
            </div>
          ) : (
            <form
              onSubmit={handleSaveScore}
              className="flex flex-wrap items-center justify-center gap-2"
            >
              <label htmlFor="driver-tag-input" className="sr-only">
                Driver Name
              </label>
              <input
                id="driver-tag-input"
                type="text"
                value={driverTag}
                maxLength={DRIVER_NAME_MAX}
                onChange={(e) => setDriverTag(e.target.value)}
                placeholder="Enter your name"
                className="flex-1 min-w-[165px] max-w-xs px-3 py-2 rounded-lg bg-[#0B0D14] border border-white/15 focus:border-[#FFB347] focus:outline-none text-sm text-white text-center placeholder:text-slate-500"
              />
              <button
                type="submit"
                disabled={savingScore}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#FFB347] hover:bg-[#FFC266] disabled:opacity-60 text-[#0B0D14] font-bold text-sm transition-colors cursor-pointer whitespace-nowrap"
              >
                <Trophy className="w-4 h-4" />
                <span>{savingScore ? 'Saving...' : `Save #${projectedRank}`}</span>
              </button>
            </form>
          )}

          {saveError && (
            <p className="mt-2 text-xs text-[#FCA5A5]">{saveError}</p>
          )}
        </div>

        {/* Built-in Unique Leaderboard (Position + Name + Score) */}
        <div className="mt-4 rounded-xl bg-[#0B0D14]/70 border border-white/10 p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-[#FFB347] mb-2">
            <Crown className="w-3.5 h-3.5" />
            <span>Leaderboard</span>
          </div>

          {leaderboardError ? (
            <div className="py-4 text-xs text-[#FCA5A5]">{leaderboardError}</div>
          ) : leaderboardLoading ? (
            <div className="py-4 text-xs text-slate-400">Loading leaderboard...</div>
          ) : visibleBoard.length === 0 ? (
            <div className="py-4 text-xs text-slate-400">
              No scores yet · Save your name to claim #1!
            </div>
          ) : (
            <div className="max-h-[122px] overflow-y-auto touch-pan-y overscroll-contain divide-y divide-white/6">
              {visibleBoard.map((entry, idx) => {
                const pos = idx + 1;
                const isSelf =
                  savedEntryId === entry.id ||
                  (normalizedInputKey.length > 0 &&
                    entry.driverName.trim().toLowerCase() === normalizedInputKey);
                const entryCar = CARS[entry.carId] ?? CARS.cheetah;
                return (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between gap-3 h-10 px-2.5 rounded-md text-center ${
                      isSelf ? 'bg-[#FFB347]/15' : ''
                    }`}
                  >
                    <span
                      className={`font-mono-num text-xs font-bold w-8 shrink-0 text-center ${
                        pos === 1
                          ? 'text-[#FFB347]'
                          : pos === 2
                          ? 'text-slate-200'
                          : pos === 3
                          ? 'text-[#FB923C]'
                          : 'text-slate-400'
                      }`}
                    >
                      #{pos}
                    </span>

                    <div className="flex items-center justify-center gap-2 min-w-0 flex-1">
                      <CarIllustration car={entryCar} className="w-3.5 h-6 shrink-0" />
                      <span className="text-xs font-semibold text-white truncate">
                        {entry.driverName}
                      </span>
                    </div>

                    <span className="font-mono-num text-xs font-bold text-[#FFB347] shrink-0">
                      ${entry.haul.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Action Bar: Play Again, Share, Main Menu Only */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={onPlayAgain}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-[#FF5E7E] hover:bg-[#FF7490] text-[#0B0D14] font-bold text-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Play Again</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#2DD4BF] hover:bg-[#5EEAD4] text-[#0B0D14] font-bold text-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            {copiedShare ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            <span>{copiedShare ? 'Copied' : 'Share'}</span>
          </button>

          <button
            type="button"
            onClick={onBackToTitle}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-white font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            <Home className="w-4 h-4" />
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
