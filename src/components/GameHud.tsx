import React from 'react';
import {
  Pause,
  Zap,
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
  wow: 'bg-[#0B0D14]/70 border-[#FFB347]/60 text-[#FFB347] font-display italic font-extrabold text-sm sm:text-lg tracking-wider shadow-[0_0_18px_rgba(255,179,71,0.22)]',
  awesome:
    'bg-[#0B0D14]/70 border-[#FF5E7E]/60 text-[#FF5E7E] font-display font-extrabold text-sm sm:text-lg tracking-wide uppercase shadow-[0_0_18px_rgba(255,94,126,0.22)]',
  great:
    'bg-[#0B0D14]/70 border-[#2DD4BF]/55 text-[#2DD4BF] font-display font-bold text-sm sm:text-base tracking-wide shadow-[0_0_16px_rgba(45,212,191,0.18)]',
  clutch:
    'bg-[#0B0D14]/70 border-[#34D399]/60 text-[#34D399] font-display italic font-extrabold text-sm sm:text-base tracking-wide shadow-[0_0_18px_rgba(52,211,153,0.22)]',
  warm:
    'bg-[#0B0D14]/70 border-[#FDE68A]/50 text-[#FDE68A] font-sans font-bold text-xs sm:text-sm tracking-normal shadow-[0_0_14px_rgba(253,230,138,0.16)]',
};

const DriftCarIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg
    viewBox="0 0 28 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {/* Curved tire skid trails */}
    <path
      d="M4 23C6.5 19.5 10.5 17.5 15 17"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeOpacity="0.85"
    />
    <path
      d="M8.5 25C11 22 14.5 20.5 19 20"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeOpacity="0.65"
    />
    {/* Angled drifting car silhouette */}
    <g transform="translate(15 11) rotate(-26)">
      <rect
        x="-5.5"
        y="-7.5"
        width="11"
        height="15"
        rx="3"
        fill="currentColor"
        fillOpacity="0.22"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M-3 -2.5H3M-2.5 3.5H2.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </g>
    {/* Drift motion sparks */}
    <circle cx="5.5" cy="18.5" r="1.2" fill="currentColor" />
    <circle cx="22.5" cy="17.5" r="1.1" fill="currentColor" fillOpacity="0.7" />
  </svg>
);

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
  const distMetersText = `${Math.max(0, Math.round(hud.distanceMeters)).toLocaleString()} m`;
  const showStartHint = hud.elapsedSec < 4.5;

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-3 sm:p-5 select-none text-center">
      {/* Top Perimeter Stack */}
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2 sm:gap-4">
          {/* Top-Left: Haul, Combo & Distance */}
          <div className="bg-[#0B0D14]/45 backdrop-blur-[2px] border border-white/12 rounded-xl px-3 py-2 min-w-[130px] sm:min-w-[170px] text-center">
            <div className="flex items-baseline justify-center gap-2">
              <span className="font-display font-extrabold text-2xl sm:text-4xl leading-none text-[#FFB347] tabular-nums">
                ${hud.haul.toLocaleString()}
              </span>
              {hud.combo > 1 && (
                <span className="font-display font-extrabold text-lg sm:text-xl leading-none text-[#2DD4BF] tabular-nums">
                  x{hud.combo}
                </span>
              )}
            </div>

            {hud.combo > 1 && (
              <div className="mt-1 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#2DD4BF] transition-none"
                  style={{ width: `${Math.round(hud.comboTimer * 100)}%` }}
                />
              </div>
            )}

            <div className="mt-1 flex items-center justify-center text-[11px] sm:text-xs text-slate-200 font-mono-num">
              <span>{distMetersText}</span>
            </div>

            {hud.targetScore !== null && (
              <div className="mt-1 text-[11px] sm:text-xs font-medium tabular-nums text-slate-200 text-center">
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

          {/* Top-Right: Stars + Mobile Mode Switch + Pause */}
          <div className="flex items-start gap-1.5 sm:gap-2">
            <div className="bg-[#0B0D14]/45 backdrop-blur-[2px] border border-white/12 rounded-xl px-2.5 sm:px-3 py-2 flex items-center justify-center">
              <div
                className="flex items-center justify-center gap-0.5 sm:gap-1"
                aria-label={`Wanted level ${hud.wantedLevel} of 5`}
              >
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    viewBox="0 0 24 24"
                    className={`w-3.5 h-3.5 sm:w-5 sm:h-5 ${
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

            <div className="pointer-events-auto flex items-center gap-1.5">
              {isTouchDevice && (
                <button
                  type="button"
                  onClick={onToggleControlMode}
                  aria-label={`Switch mobile controls (currently ${controlMode})`}
                  className="flex items-center justify-center gap-1 px-2.5 h-9 rounded-xl bg-[#0B0D14]/45 backdrop-blur-[2px] border border-[#2DD4BF]/40 text-[#2DD4BF] text-xs font-semibold cursor-pointer whitespace-nowrap"
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
                className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#0B0D14]/45 backdrop-blur-[2px] border border-white/15 text-slate-100 hover:text-white cursor-pointer"
              >
                <Pause className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Top Slim Telemetry Bar (Health & Speed/Boost kept at top with low dim transparency so bottom view is 100% clear) */}
        {isTouchDevice && (
          <div className="flex items-center justify-between gap-2">
            {/* Compact Health / Armor Bar */}
            <div
              className={`bg-[#0B0D14]/35 backdrop-blur-[2px] border rounded-lg px-2.5 py-1.5 w-36 text-center ${
                hud.armorTimer > 0
                  ? 'border-[#FACC15]/60'
                  : 'border-white/12'
              }`}
            >
              <div className="flex items-center justify-between gap-1 text-[11px] font-semibold mb-1">
                <div className="flex items-center gap-1">
                  {hud.armorTimer > 0 ? (
                    <ShieldCheck className="w-3.5 h-3.5 text-[#FACC15]" aria-label="Beast Armor" />
                  ) : (
                    <Shield className="w-3.5 h-3.5 text-[#34D399]" aria-label="Armor" />
                  )}
                  <span
                    className={`font-mono-num ${
                      healthPct <= 30 ? 'text-[#EF4444]' : 'text-slate-100'
                    }`}
                  >
                    {healthPct}%
                  </span>
                </div>
                {hud.armorTimer > 0 && (
                  <span className="font-mono-num text-[#FACC15]">{Math.ceil(hud.armorTimer)}s</span>
                )}
              </div>
              <div className="h-1.5 w-full bg-white/15 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-100"
                  style={{
                    width: `${healthPct}%`,
                    backgroundColor:
                      hud.armorTimer > 0
                        ? '#FACC15'
                        : healthPct <= 30
                        ? '#EF4444'
                        : healthPct <= 60
                        ? '#F59E0B'
                        : '#34D399',
                  }}
                />
              </div>
            </div>

            {/* Compact Speed & Nitro Bar */}
            <div className="bg-[#0B0D14]/35 backdrop-blur-[2px] border border-white/12 rounded-lg px-2.5 py-1.5 w-36 text-center">
              <div className="flex items-center justify-between gap-1.5 text-[11px] font-semibold mb-1">
                <div className="flex items-center gap-1 text-white">
                  <Gauge className="w-3.5 h-3.5 text-slate-300" aria-label="Speed" />
                  <span className="font-mono-num font-bold">{hud.speedMph}</span>
                </div>
                <div className="flex items-center gap-0.5 text-[#38BDF8]">
                  <Zap className="w-3 h-3" aria-label="Nitro" />
                  <span className="font-mono-num">{hud.nitro}%</span>
                </div>
              </div>
              <div className="h-1.5 w-full bg-white/15 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#38BDF8]"
                  style={{ width: `${hud.nitro}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Top-Center: Start Movement Hint or Performance Gratitude/Praise Banner (Always at Top in Mobile & Desktop) */}
        {(showStartHint || hud.praiseMessage) && (
          <div
            className={`pointer-events-none flex justify-center w-full ${
              isTouchDevice
                ? 'lg:fixed lg:top-5 lg:left-1/2 lg:-translate-x-1/2 lg:w-auto lg:max-w-[calc(100%-540px)]'
                : 'md:fixed md:top-5 md:left-1/2 md:-translate-x-1/2 md:w-auto md:max-w-[calc(100%-430px)]'
            }`}
          >
            {showStartHint ? (
              <div className="mx-auto px-3.5 py-1 rounded-lg bg-[#0B0D14]/65 backdrop-blur-[3px] border border-white/15 text-[11px] sm:text-xs font-medium text-slate-100 text-center">
                {isTouchDevice
                  ? controlMode === 'SWIPE'
                    ? 'Drag ◀ ▶ Steer · Tap Boost & Drift'
                    : 'Tap ◀ ▶ Steer · Tap Boost & Drift'
                  : '◀ ▶ / A D Steer · ▲ Boost · ⎵ Space Drift · ⇧ Shift Nitro'}
              </div>
            ) : hud.praiseMessage ? (
              <div
                key={`${hud.praiseStyle}-${hud.praiseMessage}`}
                className={`mx-auto px-3.5 py-1 rounded-lg border backdrop-blur-[3px] animate-praise-pop ${
                  PRAISE_STYLE_CLASSES[hud.praiseStyle] ?? PRAISE_STYLE_CLASSES.great
                }`}
              >
                <span className="inline-block animate-text-bounce">{hud.praiseMessage}</span>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Bottom Area */}
      <div className="flex flex-col gap-3">
        {/* Mobile Thumb-Friendly Controls: Elevated comfortably with low dim transparency so road visuals stay unobstructed */}
        {isTouchDevice && (
          <div className="pointer-events-auto flex items-end justify-between gap-3 pb-7 px-1">
            {/* Boost Button FIRST, then Drift Button SECOND */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Boost Speed"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onTouchInput({ nitro: true });
                }}
                onPointerUp={(e) => {
                  e.stopPropagation();
                  onTouchInput({ nitro: false });
                }}
                onPointerLeave={() => onTouchInput({ nitro: false })}
                onPointerCancel={() => onTouchInput({ nitro: false })}
                className="touch-none select-none flex flex-col items-center justify-center w-16 h-16 rounded-2xl bg-[#FF5E7E]/25 backdrop-blur-[2px] border border-[#FF5E7E]/45 text-white/95 active:bg-[#FF5E7E]/55 active:scale-95 transition-transform"
              >
                <Zap className="w-6 h-6 text-[#FF5E7E] fill-current" />
                <span className="mt-0.5 text-[10px] font-bold tracking-wide text-white/85">
                  Boost
                </span>
              </button>

              <button
                type="button"
                aria-label="Drift"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onTouchInput({ drift: true });
                }}
                onPointerUp={(e) => {
                  e.stopPropagation();
                  onTouchInput({ drift: false });
                }}
                onPointerLeave={() => onTouchInput({ drift: false })}
                onPointerCancel={() => onTouchInput({ drift: false })}
                className="touch-none select-none flex flex-col items-center justify-center w-16 h-16 rounded-2xl bg-[#2DD4BF]/20 backdrop-blur-[2px] border border-[#2DD4BF]/45 text-[#2DD4BF] active:bg-[#2DD4BF]/45 active:scale-95 transition-transform"
              >
                <DriftCarIcon className="w-6 h-6" />
                <span className="mt-0.5 text-[10px] font-bold tracking-wide text-white/85">
                  Drift
                </span>
              </button>
            </div>

            {/* Right Thumb Steering Buttons when BUTTONS mode */}
            {controlMode === 'BUTTONS' ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Steer left"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    onTouchInput({ steer: -1 });
                  }}
                  onPointerUp={(e) => {
                    e.stopPropagation();
                    onTouchInput({ steer: 0 });
                  }}
                  onPointerLeave={() => onTouchInput({ steer: 0 })}
                  onPointerCancel={() => onTouchInput({ steer: 0 })}
                  className="touch-none select-none w-[70px] h-16 rounded-2xl bg-[#0B0D14]/28 backdrop-blur-[2px] border border-white/25 text-white/90 flex items-center justify-center active:bg-white/25 active:scale-95 transition-transform"
                >
                  <ArrowLeft className="w-7 h-7" />
                </button>
                <button
                  type="button"
                  aria-label="Steer right"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    onTouchInput({ steer: 1 });
                  }}
                  onPointerUp={(e) => {
                    e.stopPropagation();
                    onTouchInput({ steer: 0 });
                  }}
                  onPointerLeave={() => onTouchInput({ steer: 0 })}
                  onPointerCancel={() => onTouchInput({ steer: 0 })}
                  className="touch-none select-none w-[70px] h-16 rounded-2xl bg-[#0B0D14]/28 backdrop-blur-[2px] border border-white/25 text-white/90 flex items-center justify-center active:bg-white/25 active:scale-95 transition-transform"
                >
                  <ArrowRight className="w-7 h-7" />
                </button>
              </div>
            ) : (
              <div />
            )}
          </div>
        )}

        {/* Desktop Perimeter Gauges (Hidden on touch mobile so bottom road stays completely open) */}
        {!isTouchDevice && (
          <div className="flex items-end justify-between gap-4">
            {/* Health / Beast Armor Icon Gauge */}
            <div
              className={`bg-[#0B0D14]/55 backdrop-blur-[2px] border rounded-xl px-3.5 py-2.5 w-48 text-center ${
                hud.armorTimer > 0
                  ? 'border-[#FACC15]/70 shadow-[0_0_16px_rgba(250,204,21,0.22)]'
                  : 'border-white/12'
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
            <div className="bg-[#0B0D14]/55 backdrop-blur-[2px] border border-white/12 rounded-xl px-3.5 py-2.5 w-52 text-center">
              <div className="flex items-center justify-center gap-1.5">
                <Gauge className="w-4 h-4 text-slate-300" aria-label="Speed" />
                <span className="font-display font-extrabold text-4xl leading-none text-white tabular-nums">
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
        )}
      </div>
    </div>
  );
};
