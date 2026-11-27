import { useCallback, useEffect, useRef, useState } from 'react';
import { GameHud } from './components/GameHud';
import { LeaderboardModal } from './components/LeaderboardModal';
import { PauseModal } from './components/PauseModal';
import { EndModal } from './components/EndModal';
import { TitleScreen } from './components/TitleScreen';
import { SoundEngine } from './game/audio';
import { CARS } from './game/cars';
import {
  getGameItem,
  initCrazyGamesSdk,
  notifyGameplayStart,
  notifyGameplayStop,
  notifyHappytime,
  requestRewardedAd,
  setGameItem,
} from './game/crazygames';
import {
  createEngineWorld,
  EngineWorld,
  getBestScore,
  getHudSnapshot,
  InputState,
  reviveEngineWorld,
  stepEngine,
} from './game/engine';
import { LeaderboardEntry, subscribeLeaderboard } from './game/leaderboard';
import { generateRandomSeed, parseChallengeFromUrl } from './game/prng';
import { renderWorld } from './game/renderer';
import {
  CarId,
  ChallengeInfo,
  ControlMode,
  GameState,
  HudSnapshot,
  RunSummary,
} from './game/types';

const CONTROL_MODE_STORAGE_KEY = 'leonida_control_mode_v2';
const SELECTED_CAR_STORAGE_KEY = 'leonida_selected_car_v1';

function getInitialControlMode(): ControlMode {
  try {
    const saved = getGameItem(CONTROL_MODE_STORAGE_KEY);
    if (saved === 'SWIPE' || saved === 'BUTTONS') return saved;
  } catch {
    // ignore storage failures
  }
  return 'BUTTONS';
}

function getInitialSelectedCar(challengeCar?: CarId): CarId {
  if (challengeCar) return challengeCar;
  try {
    const saved = getGameItem(SELECTED_CAR_STORAGE_KEY);
    if (saved === 'cheetah' || saved === 'banshee' || saved === 'comet') return saved;
  } catch {
    // ignore storage failures
  }
  return 'cheetah';
}

function detectTouchCapable(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(pointer: coarse)').matches ||
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    window.innerWidth < 768
  );
}

function makeInitialHud(
  carId: CarId,
  seed: number,
  targetScore: number | null,
  muted: boolean
): HudSnapshot {
  const spec = CARS[carId];
  return {
    haul: 0,
    distanceMeters: 0,
    speedMph: 80,
    wantedLevel: 0,
    wantedProgress: 0,
    health: spec.maxHealth,
    maxHealth: spec.maxHealth,
    armorTimer: 0,
    armorMaxTimer: 20,
    nitro: 65,
    combo: 1,
    comboTimer: 0,
    districtIndex: 0,
    districtName: 'Sunset Beach Strip',
    copsWrecked: 0,
    nearMisses: 0,
    maxCombo: 1,
    airborne: false,
    drifting: false,
    driftBonusReady: false,
    heatCooling: false,
    missileWarning: false,
    elapsedSec: 0,
    praiseMessage: null,
    praiseStyle: 'great',
    blasting: false,
    seed,
    targetScore,
    muted,
  };
}

export default function App() {
  const [initialChallenge] = useState<ChallengeInfo | null>(() => parseChallengeFromUrl());
  const [challenge, setChallenge] = useState<ChallengeInfo | null>(initialChallenge);
  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [selectedCar, setSelectedCar] = useState<CarId>(() =>
    getInitialSelectedCar(initialChallenge?.challengerCar)
  );
  const [bestScore, setBestScore] = useState<number>(() => getBestScore('ENDLESS'));
  const [runSummary, setRunSummary] = useState<RunSummary | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [bonusCoinsEarned, setBonusCoinsEarned] = useState(0);
  const [highlightEntryId, setHighlightEntryId] = useState<string | null>(null);
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [controlMode, setControlMode] = useState<ControlMode>(() => getInitialControlMode());
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(() => detectTouchCapable());

  const soundRef = useRef<SoundEngine | null>(null);
  if (!soundRef.current) {
    soundRef.current = new SoundEngine();
  }
  const [muted, setMuted] = useState<boolean>(() => soundRef.current?.isMuted() ?? false);
  const [hud, setHud] = useState<HudSnapshot>(() =>
    makeInitialHud(
      initialChallenge?.challengerCar ?? 'cheetah',
      initialChallenge?.seed ?? generateRandomSeed(),
      initialChallenge?.targetScore ?? null,
      soundRef.current?.isMuted() ?? false
    )
  );

  // Isolated simulation refs — never cause React re-renders per frame
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const worldRef = useRef<EngineWorld | null>(null);
  const gameStateRef = useRef<GameState>('TITLE_MENU');
  const controlModeRef = useRef<ControlMode>(controlMode);
  const heldKeysRef = useRef<Set<string>>(new Set());
  const touchInputRef = useRef<{ steer: number; drift: boolean; nitro: boolean }>({
    steer: 0,
    drift: false,
    nitro: false,
  });
  const swipeStateRef = useRef<{
    activePointerId: number | null;
    anchorX: number;
    gestureY: number;
    swipeSteer: number;
    swipeDrift: boolean;
    swipeNitroUntil: number;
  }>({
    activePointerId: null,
    anchorX: 0,
    gestureY: 0,
    swipeSteer: 0,
    swipeDrift: false,
    swipeNitroUntil: 0,
  });

  const showLeaderboardRef = useRef(false);
  const wasBlastingRef = useRef(false);

  useEffect(() => {
    gameStateRef.current = gameState;
    if (gameState === 'PLAYING') {
      notifyGameplayStart();
    } else {
      notifyGameplayStop();
    }
  }, [gameState]);

  // Initialize CrazyGames SDK v3 and sync cloud-saved player progress/settings
  useEffect(() => {
    let active = true;
    void initCrazyGamesSdk().then((ready) => {
      if (!active || !ready) return;
      setBestScore(getBestScore('ENDLESS'));
      setControlMode(getInitialControlMode());
      if (!initialChallenge?.challengerCar) {
        setSelectedCar(getInitialSelectedCar());
      }
      if (soundRef.current) {
        const nextMuted = soundRef.current.reloadMutedPreference();
        setMuted(nextMuted);
        setHud((prev) => ({ ...prev, muted: nextMuted }));
      }
      if (gameStateRef.current === 'PLAYING') {
        notifyGameplayStart();
      }
    });
    return () => {
      active = false;
      notifyGameplayStop();
    };
  }, [initialChallenge]);

  useEffect(() => {
    controlModeRef.current = controlMode;
    setGameItem(CONTROL_MODE_STORAGE_KEY, controlMode);
  }, [controlMode]);

  useEffect(() => {
    setGameItem(SELECTED_CAR_STORAGE_KEY, selectedCar);
  }, [selectedCar]);

  useEffect(() => {
    showLeaderboardRef.current = showLeaderboard;
  }, [showLeaderboard]);

  useEffect(() => {
    const updateTouch = () => setIsTouchDevice(detectTouchCapable());
    window.addEventListener('resize', updateTouch);
    return () => window.removeEventListener('resize', updateTouch);
  }, []);

  useEffect(() => {
    setLeaderboardLoading(true);
    const unsub = subscribeLeaderboard(
      (items) => {
        setLeaderboardEntries(items);
        setLeaderboardLoading(false);
        setLeaderboardError(null);
      },
      (err) => {
        setLeaderboardError(err.message);
        setLeaderboardLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const resetInputs = useCallback(() => {
    heldKeysRef.current.clear();
    touchInputRef.current = { steer: 0, drift: false, nitro: false };
    swipeStateRef.current = {
      activePointerId: null,
      anchorX: 0,
      gestureY: 0,
      swipeSteer: 0,
      swipeDrift: false,
      swipeNitroUntil: 0,
    };
  }, []);

  const startNewRun = useCallback(
    (reuseSeed?: number) => {
      const seed = reuseSeed ?? challenge?.seed ?? generateRandomSeed();
      const targetScore = challenge?.targetScore ?? null;
      const world = createEngineWorld({
        seed,
        mode: 'ENDLESS',
        carId: selectedCar,
        targetScore,
      });
      if (bonusCoinsEarned > 0) {
        world.score.haul += bonusCoinsEarned;
      }
      worldRef.current = world;
      wasBlastingRef.current = false;
      resetInputs();
      setRunSummary(null);
      setHud(getHudSnapshot(world, soundRef.current?.isMuted() ?? false));
      soundRef.current?.startDrivingLoops();
      setGameState('PLAYING');
    },
    [challenge, resetInputs, selectedCar, bonusCoinsEarned]
  );

  const handleWatchBonusAd = useCallback(() => {
    requestRewardedAd(
      () => {
        setBonusCoinsEarned((prev) => prev + 500);
        notifyHappytime();
      },
      () => {
        // finished
      }
    );
  }, []);

  const handleRevive = useCallback(() => {
    const world = worldRef.current;
    if (!world) {
      startNewRun(challenge?.seed);
      return;
    }
    reviveEngineWorld(world);
    wasBlastingRef.current = false;
    resetInputs();
    setRunSummary(null);
    setHud(getHudSnapshot(world, soundRef.current?.isMuted() ?? false));
    soundRef.current?.startDrivingLoops();
    setGameState('PLAYING');
  }, [challenge?.seed, resetInputs, startNewRun]);

  const handleEndBonusCoinsAdded = useCallback((amount: number) => {
    if (worldRef.current) {
      worldRef.current.score.haul += amount;
    }
    notifyHappytime();
  }, []);

  const handleCelebrate = useCallback((rank: 1 | 2 | 3) => {
    soundRef.current?.playCelebrationFanfare(rank);
    notifyHappytime();
  }, []);

  const handleToggleMute = useCallback(() => {
    if (!soundRef.current) return;
    const nextMuted = soundRef.current.toggleMute();
    setMuted(nextMuted);
    setHud((prev) => ({ ...prev, muted: nextMuted }));
  }, []);

  const handleToggleControlMode = useCallback(() => {
    resetInputs();
    setControlMode((prev) => (prev === 'SWIPE' ? 'BUTTONS' : 'SWIPE'));
  }, [resetInputs]);

  const handlePause = useCallback(() => {
    if (gameStateRef.current !== 'PLAYING') return;
    if (worldRef.current?.blast.active) return;
    resetInputs();
    soundRef.current?.stopDrivingLoops();
    setGameState('PAUSED');
  }, [resetInputs]);

  const handleResume = useCallback(() => {
    if (gameStateRef.current !== 'PAUSED') return;
    resetInputs();
    soundRef.current?.startDrivingLoops();
    setGameState('PLAYING');
  }, [resetInputs]);

  const handleQuitToTitle = useCallback(() => {
    resetInputs();
    soundRef.current?.stopDrivingLoops();
    worldRef.current = null;
    setRunSummary(null);
    setGameState('TITLE_MENU');
  }, [resetInputs]);

  const handleTouchInput = useCallback(
    (patch: { steer?: number; drift?: boolean; nitro?: boolean }) => {
      if (patch.steer !== undefined) touchInputRef.current.steer = patch.steer;
      if (patch.drift !== undefined) touchInputRef.current.drift = patch.drift;
      if (patch.nitro !== undefined) touchInputRef.current.nitro = patch.nitro;
    },
    []
  );

  const handleChallengeFromLeaderboard = useCallback(
    (entry: LeaderboardEntry) => {
      const nextChallenge: ChallengeInfo = {
        seed: entry.seed,
        targetScore: entry.haul,
        challengerCar: entry.carId,
        challengerName: entry.driverName,
      };
      setChallenge(nextChallenge);
      setSelectedCar(entry.carId);
      setShowLeaderboard(false);

      const world = createEngineWorld({
        seed: entry.seed,
        mode: 'ENDLESS',
        carId: entry.carId,
        targetScore: entry.haul,
      });
      worldRef.current = world;
      wasBlastingRef.current = false;
      resetInputs();
      setRunSummary(null);
      setHud(getHudSnapshot(world, soundRef.current?.isMuted() ?? false));
      soundRef.current?.startDrivingLoops();
      setGameState('PLAYING');
    },
    [resetInputs]
  );

  // Canvas Swipe Gesture Handlers (for Mobile Swipe Mode)
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gameStateRef.current !== 'PLAYING') return;
    if (controlModeRef.current !== 'SWIPE') return;
    if (e.pointerType === 'mouse' && !isTouchDevice) return;

    const sw = swipeStateRef.current;
    sw.activePointerId = e.pointerId;
    sw.anchorX = e.clientX;
    sw.gestureY = e.clientY;
    sw.swipeSteer = 0;
    sw.swipeDrift = false;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gameStateRef.current !== 'PLAYING') return;
    if (controlModeRef.current !== 'SWIPE') return;
    const sw = swipeStateRef.current;
    if (sw.activePointerId !== e.pointerId) return;

    const dx = e.clientX - sw.anchorX;
    const maxDrag = 54;
    sw.swipeSteer = Math.max(-1, Math.min(1, dx / maxDrag));

    // Re-anchor smoothly when dragging far so direction reversals feel instant
    if (Math.abs(dx) > 74) {
      sw.anchorX = e.clientX - Math.sign(dx) * 74;
    }

    // Vertical swipe gestures: Swipe UP for Nitro burst, Swipe DOWN to Drift
    const dy = e.clientY - sw.gestureY;
    if (dy < -42) {
      sw.swipeNitroUntil = performance.now() + 2000;
      sw.swipeDrift = false;
      sw.gestureY = e.clientY;
    } else if (dy > 42) {
      sw.swipeDrift = true;
      sw.swipeNitroUntil = 0;
      sw.gestureY = e.clientY;
    }
  };

  const handleCanvasPointerEnd = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const sw = swipeStateRef.current;
    if (sw.activePointerId === e.pointerId) {
      sw.activePointerId = null;
      sw.swipeSteer = 0;
      sw.swipeDrift = false;
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // ignore pointer capture error
      }
    }
  };

  // Keyboard & Window Blur Handling (Desktop)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') {
        if (code === 'Escape') {
          (document.activeElement as HTMLElement).blur();
        }
        return;
      }

      if (showLeaderboardRef.current) {
        if (code === 'Escape') {
          e.preventDefault();
          setShowLeaderboard(false);
        }
        return;
      }

      if (code === 'KeyM' && !e.repeat) {
        handleToggleMute();
        return;
      }

      if (gameStateRef.current === 'TITLE_MENU') {
        if (code === 'Enter' && !e.repeat) {
          e.preventDefault();
          startNewRun();
        } else if (code === 'Space' && activeTag !== 'BUTTON' && !e.repeat) {
          e.preventDefault();
          startNewRun();
        }
        return;
      }

      if (gameStateRef.current === 'PLAYING') {
        if (code === 'Escape' && !e.repeat) {
          e.preventDefault();
          handlePause();
          return;
        }
        if (code === 'KeyR' && !e.repeat) {
          e.preventDefault();
          startNewRun(worldRef.current?.seed);
          return;
        }
        if (
          code === 'ArrowLeft' ||
          code === 'ArrowRight' ||
          code === 'ArrowUp' ||
          code === 'ArrowDown' ||
          code === 'Space'
        ) {
          e.preventDefault();
        }
        heldKeysRef.current.add(code);
        return;
      }

      if (gameStateRef.current === 'PAUSED') {
        if ((code === 'Escape' || code === 'Enter') && !e.repeat) {
          e.preventDefault();
          handleResume();
        }
        return;
      }

      if (gameStateRef.current === 'GAME_OVER') {
        if ((code === 'Enter' || code === 'KeyR') && !e.repeat) {
          e.preventDefault();
          startNewRun(challenge?.seed);
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      heldKeysRef.current.delete(e.code);
    };

    const onBlur = () => {
      resetInputs();
      if (gameStateRef.current === 'PLAYING') {
        handlePause();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [challenge, handlePause, handleResume, handleToggleMute, resetInputs, startNewRun]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      soundRef.current?.stopDrivingLoops();
    };
  }, []);

  // Isolated 60fps Canvas Loop
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();
    let hudSyncAccum = 0;

    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const frame = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;

      const canvas = canvasRef.current;
      const world = worldRef.current;
      if (
        canvas &&
        world &&
        (gameStateRef.current === 'PLAYING' ||
          gameStateRef.current === 'PAUSED' ||
          gameStateRef.current === 'GAME_OVER')
      ) {
        if (gameStateRef.current === 'PLAYING') {
          const keys = heldKeysRef.current;
          const touch = touchInputRef.current;
          const sw = swipeStateRef.current;
          const swipeNitroActive = sw.swipeNitroUntil > now;
          const combinedTouchSteer =
            Math.abs(touch.steer) > 0.05 ? touch.steer : sw.swipeSteer;

          const input: InputState = {
            left: keys.has('ArrowLeft') || keys.has('KeyA'),
            right: keys.has('ArrowRight') || keys.has('KeyD'),
            up: keys.has('ArrowUp') || keys.has('KeyW'),
            down: keys.has('ArrowDown') || keys.has('KeyS'),
            drift: keys.has('Space') || touch.drift || sw.swipeDrift,
            nitro:
              keys.has('ShiftLeft') ||
              keys.has('ShiftRight') ||
              keys.has('KeyN') ||
              touch.nitro ||
              swipeNitroActive,
            touchSteer: combinedTouchSteer,
          };

          stepEngine(world, rawDt, input, soundRef.current!, (summary) => {
            wasBlastingRef.current = false;
            setRunSummary(summary);
            setBestScore(getBestScore('ENDLESS'));
            if (summary.isNewBest && summary.haul >= 3000) {
              notifyHappytime();
            }
            setHud(getHudSnapshot(world, soundRef.current?.isMuted() ?? false));
            soundRef.current?.stopDrivingLoops();
            setGameState('GAME_OVER');
          });

          if (world.blast.active && !wasBlastingRef.current) {
            wasBlastingRef.current = true;
            setHud(getHudSnapshot(world, soundRef.current?.isMuted() ?? false));
          } else {
            hudSyncAccum += rawDt;
            if (hudSyncAccum >= 0.05) {
              hudSyncAccum = 0;
              setHud(getHudSnapshot(world, soundRef.current?.isMuted() ?? false));
            }
          }
        }

        const ctx = canvas.getContext('2d');
        if (ctx) {
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          ctx.save();
          ctx.scale(dpr, dpr);
          renderWorld(ctx, world, window.innerWidth, window.innerHeight);
          ctx.restore();
        }
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#0B0D14]">
      {/* Isolated Gameplay Canvas with Swipe Gesture Support */}
      <canvas
        ref={canvasRef}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerEnd}
        onPointerCancel={handleCanvasPointerEnd}
        className={`block w-full h-full touch-none ${
          gameState === 'TITLE_MENU' ? 'hidden' : 'block'
        }`}
      />

      {gameState === 'TITLE_MENU' && (
        <TitleScreen
          selectedCar={selectedCar}
          onSelectCar={setSelectedCar}
          bestScore={bestScore}
          challenge={challenge}
          onClearChallenge={() => {
            setChallenge(null);
            window.history.replaceState({}, '', window.location.pathname);
          }}
          onStart={() => startNewRun()}
          onOpenLeaderboard={() => {
            setHighlightEntryId(null);
            setShowLeaderboard(true);
          }}
          onWatchBonusAd={handleWatchBonusAd}
          bonusCoinsEarned={bonusCoinsEarned}
          topEntries={leaderboardEntries}
          leaderboardLoading={leaderboardLoading}
          onChallengeEntry={handleChallengeFromLeaderboard}
          muted={muted}
          onToggleMute={handleToggleMute}
        />
      )}

      {gameState === 'PLAYING' && !hud.blasting && (
        <GameHud
          hud={hud}
          controlMode={controlMode}
          isTouchDevice={isTouchDevice}
          onToggleControlMode={handleToggleControlMode}
          onPause={handlePause}
          onTouchInput={handleTouchInput}
        />
      )}

      {gameState === 'PAUSED' && (
        <PauseModal
          muted={muted}
          controlMode={controlMode}
          isTouchDevice={isTouchDevice}
          onToggleControlMode={handleToggleControlMode}
          onResume={handleResume}
          onRestart={() => startNewRun(worldRef.current?.seed)}
          onToggleMute={handleToggleMute}
          onQuit={handleQuitToTitle}
        />
      )}

      {gameState === 'GAME_OVER' && runSummary && (
        <EndModal
          summary={runSummary}
          entries={leaderboardEntries}
          leaderboardLoading={leaderboardLoading}
          leaderboardError={leaderboardError}
          onPlayAgain={() => startNewRun(challenge?.seed)}
          onRevive={handleRevive}
          onBonusCoinsAdded={handleEndBonusCoinsAdded}
          onCelebrate={handleCelebrate}
          onOpenLeaderboard={() => {
            setHighlightEntryId(null);
            setShowLeaderboard(true);
          }}
          onBackToTitle={handleQuitToTitle}
        />
      )}

      {showLeaderboard && (
        <LeaderboardModal
          entries={leaderboardEntries}
          loading={leaderboardLoading}
          errorMsg={leaderboardError}
          highlightEntryId={highlightEntryId}
          onClose={() => setShowLeaderboard(false)}
          onMainMenu={() => {
            setShowLeaderboard(false);
            handleQuitToTitle();
          }}
          onChallengeEntry={handleChallengeFromLeaderboard}
        />
      )}
    </main>
  );
}
