import React from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Home, Hand, Gamepad2 } from 'lucide-react';
import { ControlMode } from '../game/types';

interface PauseModalProps {
  muted: boolean;
  controlMode: ControlMode;
  isTouchDevice: boolean;
  onToggleControlMode: () => void;
  onResume: () => void;
  onRestart: () => void;
  onToggleMute: () => void;
  onQuit: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  muted,
  controlMode,
  isTouchDevice,
  onToggleControlMode,
  onResume,
  onRestart,
  onToggleMute,
  onQuit,
}) => {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#0B0D14]/82 p-4 text-center">
      <div className="w-full max-w-sm rounded-xl bg-[#131826] border border-white/12 p-6 shadow-2xl text-center">
        <h2 className="font-display font-extrabold text-3xl text-white tracking-wide">
          Paused
        </h2>

        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#FF5E7E] hover:bg-[#FF7490] text-[#0B0D14] font-semibold text-sm transition-colors cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Resume</span>
          </button>

          <button
            type="button"
            onClick={onRestart}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-white font-semibold text-sm transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restart Run</span>
          </button>

          {isTouchDevice && (
            <button
              type="button"
              onClick={onToggleControlMode}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#2DD4BF]/12 hover:bg-[#2DD4BF]/20 border border-[#2DD4BF]/35 text-[#2DD4BF] font-semibold text-sm transition-colors cursor-pointer"
            >
              {controlMode === 'SWIPE' ? (
                <Hand className="w-4 h-4" />
              ) : (
                <Gamepad2 className="w-4 h-4" />
              )}
              <span>
                Mobile Controls: {controlMode === 'SWIPE' ? 'Swipe' : 'Buttons'}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={onToggleMute}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 font-medium text-sm transition-colors cursor-pointer"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span>{muted ? 'Unmute Audio' : 'Mute Audio'}</span>
          </button>

          <button
            type="button"
            onClick={onQuit}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-white/10 hover:border-white/25 text-slate-300 hover:text-white font-medium text-sm transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Back to Title</span>
          </button>
        </div>
      </div>
    </div>
  );
};
