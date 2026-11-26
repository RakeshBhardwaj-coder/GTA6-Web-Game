import React from 'react';
import {
  Pause,
  Zap,
  Wind,
  Shield,
  ShieldCheck,
  Gauge,
  ArrowLeft,
  ArrowRight,
  Hand,
  Gamepad2,
} from 'lucide-react';
import { ControlMode, HudSnapshot, PraiseStyle } from '../game/types';

const PRAISE_STYLE_CLASSES: Record<PraiseStyle, string> = {
  wow: 'bg-[#FFB347]/18 border-[#FFB347]/55 text-[#FFB347] font-display italic font-extrabold text-lg sm:text-xl tracking-wider shadow-[0_0_20px_rgba(255,179,71,0.22)]',
  awesome:
    'bg-[#FF5E7E]/18 border-[#FF5E7E]/55 text-[#FF5E7E] font-display font-extrabold text-lg sm:text-xl tracking-wide uppercase shadow-[0_0_20px_rgba(255,94,126,0.22)]',
  great:
    'bg-[#2DD4BF]/18 border-[#2DD4BF]/50 text-[#2DD4BF] font-display font-bold text-base sm:text-lg tracking-wide shadow-[0_0_18px_rgba(45,212,191,0.18)]',
  clutch:
    'bg-[#10B981]/22 border-[#34D399]/60 text-[#34D399] font-display italic font-extrabold text-base sm:text-lg tracking-wide shadow-[0_0_22px_rgba(52,211,153,0.25)]',
  warm:
    'bg-[#F59E0B]/16 border-[#FDE68A]/45 text-[#FDE68A] font-sans font-bold text-sm sm:text-base tracking-normal shadow-[0_0_16px_rgba(253,230,138,0.16)]',
};

interface GameHudProps {
  hud: HudSnapshot;
  controlMode: ControlMode;
  isTouchDevice: boolean;
  onToggleControlMode: () => void;
  onPause: () => void;
  onTouchInput: (patch: {
    steer?: number;
    drift?: boolean;
    nitro?: boolean;
  }) => void;
}

export const GameHud: React.FC<GameHudProps> = ({
  hud,
  controlMode,
  isTouchDevice,
  onToggleControlMode,
  onPause,
  onTouchInput,
}) => {
  const healthPct = Math.max(0, Math.min(100, Math.round((hud.health / hud.maxHealth) * 100)));
  const distKm = (hud.distanceMeters / 1000).toFixed(2);
  const showStartHint = hud.elapsedSec < 4.5;

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-3 sm:p-5 select-none text-center">
      {/* Top Perimeter Row */}
      <div className="flex items-start justify-between gap-2 sm:gap-4">
        {/* Top-Left: Haul, Combo & Distance */}
        <div className="bg-[#0B0D14]/82 border border-white/10 rounded-lg px-3.5 py-2.5 min-w-[140px] sm:min-w-[170px] text-center">
          <div className="flex items-baseline justify-center gap-2">
            <span className="font-display font-extrabold text-3xl sm:text-4xl leading-none text-[#FFB347] tabular-nums">
              ${hud.haul.toLocaleString()}
            </span>
            {hud.combo > 1 && (
              <span className="font-display font-extrabold text-xl leading-none text-[#2DD4BF] tabular-nums">
                x{hud.combo}
              </span>
            )}
          </div>

          {hud.combo > 1 && (
            <div className="mt-1.5 h-1 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#2DD4BF] transition-none"
                style={{ width: `${Math.round(hud.comboTimer * 100)}%` }}
              />
            </div>
          )}

          <div className="mt-1.5 flex items-center justify-center text-xs text-slate-300 font-mono-num">
            <span>{distKm} km</span>
          </div>

          {hud.targetScore !== null && (
            <div className="mt-1.5 text-xs font-medium tabular-nums text-slate-300 text-center">
              {hud.haul >= hud.targetScore ? (
                <span className="text-[#34D399]">
                  Ahead (+${(hud.haul - hud.targetScore).toLocaleString()})
                </span>
              ) : (
                <span className="text-[#FFB347]">
                  Target ${hud.targetScore.toLocaleString()}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Top-Right: Stars Sign Only + Mobile Switch + Pause (Silent button moved to Paused) */}
        <div className="flex items-start gap-2">
          <div className="bg-[#0B0D14]/82 border border-white/10 rounded-lg px-3 py-2.5 flex items-center justify-center">
            <div
              className="flex items-center justify-center gap-1"
              aria-label={`Wanted level ${hud.wantedLevel} of 5`}
            >
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  viewBox="0 0 24 24"
                  className={`w-4 h-4 sm:w-5 sm:h-5 ${
                    star <= hud.wantedLevel
                      ? 'text-[#FF5E7E] fill-current'
                      : 'text-white/20 fill-current'
                  }`}
                >
                  <path d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.3l-5.8 3.1 1.1-6.5L2.6 9.3l6.5-.9L12 2.5z" />
                </svg>
              ))}
            </div>
          </div>

          <div className="pointer-events-auto flex flex-col sm:flex-row gap-1.5">
            {isTouchDevice && (
              <button
                type="button"
                onClick={onToggleControlMode}
                aria-label={`Switch mobile controls (currently ${controlMode})`}
                className="flex items-center justify-center gap-1.5 px-2.5 h-10 rounded-lg bg-[#0B0D14]/85 border border-[#2DD4BF]/45 text-[#2DD4BF] text-xs font-semibold cursor-pointer whitespace-nowrap"
              >
                {controlMode === 'SWIPE' ? (
                  <>
                    <Hand className="w-3.5 h-3.5" />
                    <span>Swipe</span>
                  </>
                ) : (
                  <>
                    <Gamepad2 className="w-3.5 h-3.5" />
                    <span>Buttons</span>
                  </>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={onPause}
              aria-label="Pause game"
              className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#0B0D14]/85 border border-white/15 text-slate-200 hover:text-white cursor-pointer"
            >
              <Pause className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Center-Top: Start Movement Suggestion (Hidden after start) or One-Time Performance Praise */}
      <div className="flex flex-col items-center justify-center pointer-events-none">
        {showStartHint ? (
          <div className="mx-auto px-4 py-2 rounded-lg bg-[#0B0D14]/82 border border-white/12 text-xs sm:text-sm font-medium text-slate-100 text-center">
            {isTouchDevice
              ? controlMode === 'SWIPE'
                ? 'Drag ◀ ▶ Steer · Tap Drift & Nitro'
                : 'Tap ◀ ▶ Steer · Tap Drift & Nitro'
              : '◀ ▶ / A D Steer · ▲ Boost · ⎵ Space Drift · ⇧ Shift Nitro'}
          </div>
        ) : hud.praiseMessage ? (
          <div
            key={`${hud.praiseStyle}-${hud.praiseMessage}`}
            className={`mx-auto px-4 py-1.5 rounded-lg border animate-praise-pop ${
              PRAISE_STYLE_CLASSES[hud.praiseStyle] ?? PRAISE_STYLE_CLASSES.great
            }`}
          >
            <span className="inline-block animate-text-bounce">{hud.praiseMessage}</span>
          </div>
        ) : null}
      </div>

      {/* Bottom Perimeter Row */}
      <div className="flex flex-col gap-3">
        {/* Mobile Action Controls: Drift & Boost icons on the LEFT side; Left/Right steer on the RIGHT when BUTTONS mode */}
        {isTouchDevice && (
          <div className="pointer-events-auto flex items-center justify-between gap-4 pb-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Drift"
                onPointerDown={() => onTouchInput({ drift: true })}
                onPointerUp={() => onTouchInput({ drift: false })}
                onPointerLeave={() => onTouchInput({ drift: false })}
                onPointerCancel={() => onTouchInput({ drift: false })}
                className="flex items-center justify-center w-14 h-14 rounded-lg bg-[#0B0D14]/78 border border-[#2DD4BF]/50 text-[#2DD4BF] active:bg-[#2DD4BF]/25"
              >
                <Wind className="w-6 h-6" />
              </button>
              <button
                type="button"
                aria-label="Boost Nitro"
                onPointerDown={() => onTouchInput({ nitro: true })}
                onPointerUp={() => onTouchInput({ nitro: false })}
                onPointerLeave={() => onTouchInput({ nitro: false })}
                onPointerCancel={() => onTouchInput({ nitro: false })}
                className="flex items-center justify-center w-14 h-14 rounded-lg bg-[#FF5E7E]/90 text-[#0B0D14] active:bg-[#FF5E7E]"
              >
                <Zap className="w-6 h-6 fill-current" />
              </button>
            </div>

            {controlMode === 'BUTTONS' ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Steer left"
                  onPointerDown={() => onTouchInput({ steer: -1 })}
                  onPointerUp={() => onTouchInput({ steer: 0 })}
                  onPointerLeave={() => onTouchInput({ steer: 0 })}
                  onPointerCancel={() => onTouchInput({ steer: 0 })}
                  className="w-16 h-14 rounded-lg bg-[#0B0D14]/78 border border-white/25 text-white flex items-center justify-center active:bg-white/25"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  aria-label="Steer right"
                  onPointerDown={() => onTouchInput({ steer: 1 })}
                  onPointerUp={() => onTouchInput({ steer: 0 })}
                  onPointerLeave={() => onTouchInput({ steer: 0 })}
                  onPointerCancel={() => onTouchInput({ steer: 0 })}
                  className="w-16 h-14 rounded-lg bg-[#0B0D14]/78 border border-white/25 text-white flex items-center justify-center active:bg-white/25"
                >
                  <ArrowRight className="w-6 h-6" />
                </button>
              </div>
            ) : (
              <div />
            )}
          </div>
        )}

        {/* Perimeter Gauges (Icons Only — No "ARMOR" or "NITRO" text): Health (Bottom-Left) & Speed/Nitro (Bottom-Right) */}
        <div className="flex items-end justify-between gap-4">
          {/* Health / Beast Armor Icon Gauge */}
          <div
            className={`bg-[#0B0D14]/82 border rounded-lg px-3.5 py-2.5 w-36 sm:w-48 text-center ${
              hud.armorTimer > 0
                ? 'border-[#FACC15]/70 shadow-[0_0_16px_rgba(250,204,21,0.22)]'
                : 'border-white/10'
            }`}
          >
            {hud.armorTimer > 0 && (
              <div className="mb-2">
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold mb-1 text-[#FACC15]">
                  <ShieldCheck className="w-4 h-4 shrink-0" aria-label="Beast Armor" />
                  <span className="font-mono-num">{Math.ceil(hud.armorTimer)}s</span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#FACC15]"
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(100, (hud.armorTimer / Math.max(1, hud.armorMaxTimer)) * 100)
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold mb-1.5">
              <Shield className="w-4 h-4 text-[#34D399]" aria-label="Armor" />
              <span
                className={`font-mono-num ${
                  healthPct <= 30 ? 'text-[#EF4444]' : 'text-slate-100'
                }`}
              >
                {healthPct}%
              </span>
            </div>
            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-100"
                style={{
                  width: `${healthPct}%`,
                  backgroundColor:
                    healthPct <= 30 ? '#EF4444' : healthPct <= 60 ? '#F59E0B' : '#34D399',
                }}
              />
            </div>
          </div>

          {/* Speed & Nitro Icon Gauge */}
          <div className="bg-[#0B0D14]/82 border border-white/10 rounded-lg px-3.5 py-2.5 w-40 sm:w-52 text-center">
            <div className="flex items-center justify-center gap-1.5">
              <Gauge className="w-4 h-4 text-slate-300" aria-label="Speed" />
              <span className="font-display font-extrabold text-3xl sm:text-4xl leading-none text-white tabular-nums">
                {hud.speedMph}
              </span>
            </div>

            <div className="mt-1.5 flex items-center justify-center gap-1.5 text-xs font-semibold mb-1">
              <Zap className="w-4 h-4 text-[#38BDF8]" aria-label="Nitro" />
              <span className="font-mono-num text-slate-200">{hud.nitro}%</span>
            </div>
            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#38BDF8]"
                style={{ width: `${hud.nitro}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
