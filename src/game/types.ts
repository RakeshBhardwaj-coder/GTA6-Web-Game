export type GameState = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

export type GameMode = 'ENDLESS';

export type ControlMode = 'SWIPE' | 'BUTTONS';

export type CarId = 'cheetah' | 'banshee' | 'comet';

export interface CarSpec {
  id: CarId;
  name: string;
  bodyColor: string;
  accentColor: string;
  stripeColor: string;
  topSpeed: number;     // internal px/s
  displayTopMph: number;
  accel: number;
  handling: number;
  maxHealth: number;
  nitroCapacity: number;
  driftGrip: number;
}

export interface ChallengeInfo {
  seed: number;
  targetScore?: number;
  challengerCar?: CarId;
  challengerName?: string;
}

export type PraiseStyle = 'wow' | 'awesome' | 'great' | 'clutch' | 'warm';

export interface HudSnapshot {
  haul: number;
  distanceMeters: number;
  speedMph: number;
  wantedLevel: number; // 0..5
  wantedProgress: number; // 0..1 towards next star
  health: number;
  maxHealth: number;
  armorTimer: number;
  armorMaxTimer: number;
  nitro: number; // 0..100
  combo: number;
  comboTimer: number; // 0..1
  districtIndex: number; // 0..2
  districtName: string;
  copsWrecked: number;
  nearMisses: number;
  maxCombo: number;
  airborne: boolean;
  drifting: boolean;
  driftBonusReady: boolean;
  heatCooling: boolean;
  missileWarning: boolean;
  elapsedSec: number;
  praiseMessage: string | null;
  praiseStyle: PraiseStyle;
  blasting: boolean;
  seed: number;
  targetScore: number | null;
  muted: boolean;
}

export type EndReason = 'WRECKED' | 'BUSTED';

export interface RunSummary {
  haul: number;
  distanceMeters: number;
  copsWrecked: number;
  nearMisses: number;
  maxCombo: number;
  peakStars: number;
  durationSec: number;
  carId: CarId;
  seed: number;
  mode: GameMode;
  isVictory: boolean;
  reason: EndReason;
  killedBy: string;
  titleEarned: string;
  beatTarget: boolean | null;
  targetScore: number | null;
  isNewBest: boolean;
}
