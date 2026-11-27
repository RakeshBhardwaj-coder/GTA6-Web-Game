import { SoundEngine } from './audio';
import { CARS, DISTRICTS } from './cars';
import { getGameItem, setGameItem } from './crazygames';
import { createRng } from './prng';
import {
  CarId,
  EndReason,
  GameMode,
  HudSnapshot,
  PraiseStyle,
  RunSummary,
} from './types';

export const PX_PER_METER = 14;
export const ROAD_HALF_WIDTH = 210; // 420px wide 4-lane highway
export const LANE_WIDTH = 105;
export const LANE_CENTERS = [-157.5, -52.5, 52.5, 157.5];

export interface CurveParams {
  p1: number;
  p2: number;
  p3: number;
}

export function getRoadCenterX(worldY: number, curve: CurveParams): number {
  // Smooth multi-octave coastal highway curves; straightish at very start
  const rampIn = Math.min(1, Math.max(0, worldY / 1400));
  return (
    rampIn *
    (Math.sin(worldY * 0.00052 + curve.p1) * 145 +
      Math.sin(worldY * 0.00118 + curve.p2) * 72 +
      Math.cos(worldY * 0.00028 + curve.p3) * 85)
  );
}

export function getRoadSlope(worldY: number, curve: CurveParams): number {
  const d = 12;
  return (getRoadCenterX(worldY + d, curve) - getRoadCenterX(worldY - d, curve)) / (2 * d);
}

export type TrafficKind = 'sedan' | 'convertible' | 'van' | 'truck' | 'ramp';

export interface TrafficCar {
  id: number;
  kind: TrafficKind;
  lane: number;
  laneX: number;
  worldY: number;
  speed: number;
  width: number;
  length: number;
  color: string;
  nearMissed: boolean;
  wrecked: boolean;
  vx: number;
  vy: number;
  spin: number;
  spinVel: number;
  alpha: number;
}

export type CopKind = 'cruiser' | 'interceptor' | 'swat' | 'army_car';

export interface CopCar {
  id: number;
  kind: CopKind;
  laneX: number;
  worldY: number;
  speed: number;
  vx: number;
  width: number;
  length: number;
  hp: number;
  maxHp: number;
  targetLaneX: number;
  aiPhase: number;
  turretAngle: number;
  fireCooldown: number;
  lockLaneX: number | null;
  lockWorldY: number | null;
  wrecked: boolean;
  spin: number;
  spinVel: number;
  hitFlash: number;
  alpha: number;
}

export interface SeaBoat {
  id: number;
  side: 'left' | 'right';
  laneX: number;
  worldY: number;
  speed: number;
  vx: number;
  turretAngle: number;
  fireCooldown: number;
  lockLaneX: number | null;
  lockWorldY: number | null;
  disengaging: boolean;
}

export interface Missile {
  id: number;
  source: 'chopper' | 'army' | 'boat';
  startLaneX: number;
  startWorldY: number;
  laneX: number;
  worldY: number;
  targetLaneX: number;
  targetWorldY: number;
  speed: number;
  fuseTimer: number;
  maxFuse: number;
  exploded: boolean;
}

export interface Hazard {
  id: number;
  kind: 'roadblock' | 'spikes';
  lane: number;
  laneX: number;
  worldY: number;
  width: number;
  length: number;
  triggered: boolean;
}

export interface Pickup {
  id: number;
  kind: 'cash' | 'nitro' | 'repair' | 'armor';
  laneX: number;
  worldY: number;
  collected: boolean;
  bobPhase: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  kind: 'spark' | 'smoke' | 'flame' | 'debris' | 'cash';
}

export interface SkidMark {
  worldY1: number;
  worldX1: number;
  worldY2: number;
  worldX2: number;
  alpha: number;
}

export interface FloatingPopup {
  laneX: number;
  worldY: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  drift: boolean;
  nitro: boolean;
  touchSteer: number; // -1..1
}

export interface CarPickupEffect {
  kind: 'health' | 'boost' | 'armor';
  timer: number;
  duration: number;
}

export interface EngineWorld {
  seed: number;
  mode: GameMode;
  carId: CarId;
  rng: () => number;
  curve: CurveParams;
  time: number;
  hitstopTimer: number;
  shakeIntensity: number;
  cameraWorldX: number;
  targetScore: number | null;

  player: {
    laneX: number;
    worldY: number;
    vx: number;
    speed: number;
    heading: number; // visual angle
    driftAngle: number;
    drifting: boolean;
    driftCharge: number;
    boosting: boolean;
    airZ: number;
    airVelZ: number;
    health: number;
    maxHealth: number;
    armorTimer: number;
    armorMaxTimer: number;
    nitro: number;
    maxNitro: number;
    hitFlash: number;
    invulnTimer: number;
    bustMeter: number; // 0..1
    lastDamageBy: string;
    lastBusterBy: string;
    pickupEffects: CarPickupEffect[];
  };

  score: {
    haul: number;
    combo: number;
    comboTimer: number; // seconds left
    maxCombo: number;
    copsWrecked: number;
    nearMisses: number;
    wantedLevel: number;
    wantedPoints: number;
    peakStars: number;
  };

  helicopter: {
    active: boolean;
    laneX: number;
    worldYOffset: number;
    phase: number;
    rotorAngle: number;
    missileCooldown: number;
  };

  rules: {
    speedingTimer: number;
    wrongLaneTimer: number;
    offenseCooldown: number;
    cleanTimer: number;
    coolingDown: boolean;
  };

  praise: {
    text: string | null;
    style: PraiseStyle;
    timer: number;
    cooldown: number;
    shownKeys: Record<string, boolean>;
  };

  traffic: TrafficCar[];
  cops: CopCar[];
  boats: SeaBoat[];
  missiles: Missile[];
  hazards: Hazard[];
  pickups: Pickup[];
  particles: Particle[];
  skids: SkidMark[];
  popups: FloatingPopup[];

  nextEntityId: number;
  nextTrafficSpawnY: number;
  nextHazardSpawnY: number;
  nextCopSpawnTime: number;
  nextBoatSpawnTime: number;
  nextArmorSpawnTime: number;
  prevLeftWheelWorld: { x: number; y: number } | null;
  prevRightWheelWorld: { x: number; y: number } | null;
  blast: {
    active: boolean;
    timer: number;
    duration: number;
    reason: EndReason;
    ringRadius: number;
    flashAlpha: number;
    fadeAlpha: number;
    pendingSummary: RunSummary | null;
  };
  finished: boolean;
}

const CIVILIAN_COLORS = [
  '#F8FAFC',
  '#38BDF8',
  '#FB7185',
  '#FBBF24',
  '#A78BFA',
  '#34D399',
  '#94A3B8',
  '#F472B6',
];

const BEST_SCORE_PREFIX = 'leonida_best_v1_';

export function getBestScore(mode: GameMode): number {
  try {
    const val = getGameItem(`${BEST_SCORE_PREFIX}${mode}`);
    return val ? parseInt(val, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

function saveBestScore(mode: GameMode, score: number): boolean {
  try {
    const prev = getBestScore(mode);
    if (score > prev) {
      setGameItem(`${BEST_SCORE_PREFIX}${mode}`, String(Math.round(score)));
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function createEngineWorld(opts: {
  seed: number;
  mode: GameMode;
  carId: CarId;
  targetScore: number | null;
}): EngineWorld {
  const rng = createRng(opts.seed);
  const spec = CARS[opts.carId];

  const curve: CurveParams = {
    p1: rng() * Math.PI * 2,
    p2: rng() * Math.PI * 2,
    p3: rng() * Math.PI * 2,
  };

  const world: EngineWorld = {
    seed: opts.seed,
    mode: opts.mode,
    carId: opts.carId,
    rng,
    curve,
    time: 0,
    hitstopTimer: 0,
    shakeIntensity: 0,
    cameraWorldX: 0,
    targetScore: opts.targetScore,

    player: {
      laneX: 52.5,
      worldY: 0,
      vx: 0,
      speed: 440,
      heading: 0,
      driftAngle: 0,
      drifting: false,
      driftCharge: 0,
      boosting: false,
      airZ: 0,
      airVelZ: 0,
      health: spec.maxHealth,
      maxHealth: spec.maxHealth,
      armorTimer: 0,
      armorMaxTimer: 20,
      nitro: spec.nitroCapacity * 0.65,
      maxNitro: spec.nitroCapacity,
      hitFlash: 0,
      invulnTimer: 0,
      bustMeter: 0,
      lastDamageBy: 'Highway Crash',
      lastBusterBy: 'Police Cruiser',
      pickupEffects: [],
    },

    score: {
      haul: 0,
      combo: 1,
      comboTimer: 0,
      maxCombo: 1,
      copsWrecked: 0,
      nearMisses: 0,
      wantedLevel: 0,
      wantedPoints: 0,
      peakStars: 0,
    },

    helicopter: {
      active: false,
      laneX: 0,
      worldYOffset: 240,
      phase: rng() * 6,
      rotorAngle: 0,
      missileCooldown: 3.4,
    },

    rules: {
      speedingTimer: 0,
      wrongLaneTimer: 0,
      offenseCooldown: 0,
      cleanTimer: 0,
      coolingDown: false,
    },

    praise: {
      text: null,
      style: 'great',
      timer: 0,
      cooldown: 0,
      shownKeys: {},
    },

    traffic: [],
    cops: [],
    boats: [],
    missiles: [],
    hazards: [],
    pickups: [],
    particles: [],
    skids: [],
    popups: [],

    nextEntityId: 1,
    nextTrafficSpawnY: 750,
    nextHazardSpawnY: 3200,
    nextCopSpawnTime: 2.2,
    nextBoatSpawnTime: 0,
    nextArmorSpawnTime: 14,
    prevLeftWheelWorld: null,
    prevRightWheelWorld: null,
    blast: {
      active: false,
      timer: 0,
      duration: 1.25,
      reason: 'WRECKED',
      ringRadius: 0,
      flashAlpha: 0,
      fadeAlpha: 0,
      pendingSummary: null,
    },
    finished: false,
  };

  // Seed initial traffic wave cleanly ahead
  for (let i = 0; i < 7; i++) {
    spawnTrafficWave(world);
  }

  return world;
}

function addParticle(world: EngineWorld, p: Particle): void {
  if (world.particles.length >= 260) {
    world.particles.shift();
  }
  world.particles.push(p);
}

function addPopup(
  world: EngineWorld,
  laneX: number,
  worldY: number,
  text: string,
  color: string
): void {
  if (world.popups.length >= 20) {
    world.popups.shift();
  }
  world.popups.push({
    laneX,
    worldY,
    text,
    color,
    life: 0.95,
    maxLife: 0.95,
  });
}

function triggerPraiseOnce(
  world: EngineWorld,
  key: string,
  text: string,
  style: PraiseStyle = 'great',
  urgent = false
): void {
  if (world.praise.shownKeys[key]) return;
  if (!urgent && (world.praise.timer > 0 || world.praise.cooldown > 0)) return;
  if (world.time < 4.6) return;
  world.praise.shownKeys[key] = true;
  world.praise.text = text;
  world.praise.style = style;
  world.praise.timer = 2.4;
  world.praise.cooldown = 6.0;
}

function awardHaul(world: EngineWorld, baseAmount: number, bumpCombo: boolean): number {
  if (bumpCombo) {
    world.score.combo = Math.min(15, world.score.combo + 1);
    world.score.comboTimer = 4.2;
    if (world.score.combo > world.score.maxCombo) {
      world.score.maxCombo = world.score.combo;
    }
    if (world.score.combo >= 8) {
      triggerPraiseOnce(world, 'combo8', 'Awesome! Unstoppable Streak!', 'awesome');
    } else if (world.score.combo >= 4) {
      triggerPraiseOnce(world, 'combo4', 'Great Combo! Smooth Driving!', 'great');
    }
  } else if (world.score.comboTimer > 0) {
    world.score.comboTimer = Math.max(world.score.comboTimer, 2.5);
  }
  const starBonus = 1 + Math.max(0, world.score.wantedLevel - 1) * 0.25;
  const total = Math.round(baseAmount * world.score.combo * starBonus);
  world.score.haul += total;
  return total;
}

function spawnBurst(
  world: EngineWorld,
  laneX: number,
  worldY: number,
  color: string,
  count: number,
  kind: Particle['kind'] = 'spark',
  speedScale = 1
): void {
  const cx = getRoadCenterX(worldY, world.curve) + laneX;
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = (80 + Math.random() * 240) * speedScale;
    addParticle(world, {
      x: cx + (Math.random() - 0.5) * 18,
      y: worldY + (Math.random() - 0.5) * 18,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      size: kind === 'smoke' ? 8 + Math.random() * 10 : 3 + Math.random() * 4,
      color,
      life: 0.32 + Math.random() * 0.35,
      maxLife: 0.67,
      kind,
    });
  }
}

interface LoadBalance {
  levelFactor: number;
  healthFactor: number;
  difficulty: number;
  trafficGapScale: number;
  doubleLaneChance: number;
  tripleLaneChance: number;
  trafficSpeedMult: number;
  pickupChance: number;
  repairBias: number;
  copAggression: number;
  maxCops: number;
  copCooldown: number;
  hazardBlockCount: number;
  hazardIntervalScale: number;
}

function computeLoadBalance(world: EngineWorld): LoadBalance {
  const distMeters = Math.max(0, world.player.worldY / PX_PER_METER);
  const starNorm = Math.max(0, Math.min(1, world.score.wantedLevel / 5));
  const distNorm = Math.min(1, distMeters / 7500);
  const levelFactor = Math.min(1, starNorm * 0.78 + distNorm * 0.22);

  const healthFactor = Math.max(
    0,
    Math.min(1, world.player.health / Math.max(1, world.player.maxHealth))
  );

  // Dynamic Load Balancer:
  // - Higher level -> higher difficulty
  // - Lower health -> noticeably eases traffic & spikes repair drops so clutch comebacks feel awesome
  // - Good health -> ramps traffic speed & villain intensity for high-dopamine flow
  let rawDiff = 0.1 + levelFactor * 0.76;
  if (healthFactor >= 0.65) {
    rawDiff += ((healthFactor - 0.65) / 0.35) * 0.14;
  } else if (healthFactor < 0.55) {
    rawDiff -= ((0.55 - healthFactor) / 0.55) * 0.42;
  }
  const difficulty = Math.max(0.06, Math.min(1, rawDiff));

  // Lighter, cleaner traffic overall so villains & missiles shine without road clutter
  const trafficGapScale = 1.82 - difficulty * 0.68;
  const doubleLaneChance = 0.08 + difficulty * 0.34;
  const tripleLaneChance = 0;
  const trafficSpeedMult = 0.86 + difficulty * 0.24;
  const nitroFactor = Math.max(
    0,
    Math.min(1, world.player.nitro / Math.max(1, world.player.maxNitro))
  );
  const pickupChance =
    0.42 +
    (1 - healthFactor) * 0.22 +
    (nitroFactor < 0.45 ? 0.12 : 0) +
    (world.score.combo >= 4 ? 0.05 : 0);
  const repairBias =
    healthFactor < 0.32 ? 0.5 : healthFactor < 0.62 ? 0.28 : 0.12;
  const copAggression = 0.72 + difficulty * 0.54;
  const maxCops =
    world.score.wantedLevel === 0
      ? 0
      : world.score.wantedLevel === 1
      ? 1
      : difficulty < 0.48 && world.score.wantedLevel < 3
      ? 2
      : 3;
  const copCooldown =
    Math.max(2.6, 5.6 - difficulty * 2.8) + (healthFactor < 0.35 ? 1.4 : 0);
  const hazardBlockCount = difficulty >= 0.68 && healthFactor >= 0.48 ? 2 : 1;
  const hazardIntervalScale = 1.28 - difficulty * 0.44 + (healthFactor < 0.35 ? 0.35 : 0);

  return {
    levelFactor,
    healthFactor,
    difficulty,
    trafficGapScale,
    doubleLaneChance,
    tripleLaneChance,
    trafficSpeedMult,
    pickupChance,
    repairBias,
    copAggression,
    maxCops,
    copCooldown,
    hazardBlockCount,
    hazardIntervalScale,
  };
}

function spawnTrafficWave(world: EngineWorld): void {
  const bal = computeLoadBalance(world);
  const distMeters = world.nextTrafficSpawnY / PX_PER_METER;
  const gap = (340 + world.rng() * 240) * bal.trafficGapScale;
  const spawnY = world.nextTrafficSpawnY;
  world.nextTrafficSpawnY += gap;

  // Less traffic: 1 or occasionally 2 lanes max, leaving open lanes to weave & dodge missiles
  const laneCount = world.rng() < bal.doubleLaneChance ? 2 : 1;
  const availableLanes = [0, 1, 2, 3];

  for (let i = 0; i < laneCount; i++) {
    const idx = Math.floor(world.rng() * availableLanes.length);
    const lane = availableLanes.splice(idx, 1)[0];
    const roll = world.rng();

    let kind: TrafficKind = 'sedan';
    let width = 34;
    let length = 66;
    let speed = 250 + world.rng() * 165;

    const truckThreshold = bal.healthFactor < 0.4 ? 0.14 : 0.22;
    if (roll < 0.09 && distMeters > 160) {
      kind = 'ramp';
      width = 44;
      length = 94;
      speed = 210 + world.rng() * 60;
    } else if (roll < truckThreshold) {
      kind = 'truck';
      width = 42;
      length = 104;
      speed = 220 + world.rng() * 85;
    } else if (roll < 0.42) {
      kind = 'van';
      width = 38;
      length = 78;
      speed = 245 + world.rng() * 105;
    } else if (roll < 0.68) {
      kind = 'convertible';
      width = 34;
      length = 64;
      speed = 300 + world.rng() * 175;
    }

    if (lane <= 1) speed += 50;
    if (kind !== 'ramp') {
      speed *= bal.trafficSpeedMult;
    }

    const color =
      kind === 'ramp'
        ? '#F59E0B'
        : CIVILIAN_COLORS[Math.floor(world.rng() * CIVILIAN_COLORS.length)];

    world.traffic.push({
      id: world.nextEntityId++,
      kind,
      lane,
      laneX: LANE_CENTERS[lane] + (world.rng() - 0.5) * 14,
      worldY: spawnY + (i > 0 ? (world.rng() - 0.5) * 75 : 0),
      speed,
      width,
      length,
      color,
      nearMissed: false,
      wrecked: false,
      vx: 0,
      vy: 0,
      spin: 0,
      spinVel: 0,
      alpha: 1,
    });
  }

  // Balanced pickups on a free lane (including rare Beast Armor Shield!)
  const armorDue =
    world.time >= world.nextArmorSpawnTime &&
    world.player.armorTimer <= 0 &&
    !world.pickups.some((pk) => pk.kind === 'armor');
  if (armorDue && availableLanes.length > 0) {
    const aLane = availableLanes[Math.floor(world.rng() * availableLanes.length)];
    world.nextArmorSpawnTime = world.time + 32;
    world.pickups.push({
      id: world.nextEntityId++,
      kind: 'armor',
      laneX: LANE_CENTERS[aLane],
      worldY: spawnY + 40,
      collected: false,
      bobPhase: world.rng() * Math.PI * 2,
    });
  } else if (world.rng() < bal.pickupChance && availableLanes.length > 0) {
    const pLane = availableLanes[Math.floor(world.rng() * availableLanes.length)];
    const pRoll = world.rng();
    let pKind: Pickup['kind'];
    if (pRoll < bal.repairBias) {
      pKind = 'repair';
    } else {
      const rem = (pRoll - bal.repairBias) / Math.max(0.01, 1 - bal.repairBias);
      const cashCutoff = world.player.nitro < world.player.maxNitro * 0.45 ? 0.34 : 0.46;
      pKind = rem < cashCutoff ? 'cash' : 'nitro';
    }
    world.pickups.push({
      id: world.nextEntityId++,
      kind: pKind,
      laneX: LANE_CENTERS[pLane],
      worldY: spawnY + 40,
      collected: false,
      bobPhase: world.rng() * Math.PI * 2,
    });
  }
}

function spawnHazardWave(world: EngineWorld): void {
  const stars = world.score.wantedLevel;
  // No stars = no police roadblocks or spike strips!
  if (stars < 2) return;

  const bal = computeLoadBalance(world);
  const interval = Math.max(1350, 2450 * bal.hazardIntervalScale);
  const spawnY = Math.max(world.nextHazardSpawnY, world.player.worldY + 1350);
  world.nextHazardSpawnY = spawnY + interval + world.rng() * 650;

  if (bal.healthFactor < 0.25 && world.rng() < 0.45) return;

  const lanes = [0, 1, 2, 3];
  const blockCount = bal.hazardBlockCount;
  const kind: Hazard['kind'] =
    stars >= 3 && world.rng() < 0.45 ? 'spikes' : 'roadblock';

  for (let i = 0; i < blockCount; i++) {
    const idx = Math.floor(world.rng() * lanes.length);
    const lane = lanes.splice(idx, 1)[0];
    world.hazards.push({
      id: world.nextEntityId++,
      kind,
      lane,
      laneX: LANE_CENTERS[lane],
      worldY: spawnY,
      width: kind === 'spikes' ? 84 : 88,
      length: kind === 'spikes' ? 24 : 36,
      triggered: false,
    });
  }

  if (blockCount === 2 && world.rng() < 0.55) {
    const rampLane = Math.floor(world.rng() * 4);
    world.traffic.push({
      id: world.nextEntityId++,
      kind: 'ramp',
      lane: rampLane,
      laneX: LANE_CENTERS[rampLane],
      worldY: spawnY - 310,
      speed: 190,
      width: 44,
      length: 94,
      color: '#F59E0B',
      nearMissed: false,
      wrecked: false,
      vx: 0,
      vy: 0,
      spin: 0,
      spinVel: 0,
      alpha: 1,
    });
  }
}

function spawnCop(world: EngineWorld): void {
  const stars = world.score.wantedLevel;
  // No stars = NO police or military villains!
  if (stars <= 0) return;

  const bal = computeLoadBalance(world);
  const activeCops = world.cops.filter((c) => !c.wrecked);
  if (activeCops.length >= bal.maxCops) return;

  let kind: CopKind = 'cruiser';
  if (stars >= 4 && world.rng() < 0.38) {
    kind = 'army_car';
  } else if (stars >= 3 && world.rng() < 0.42) {
    kind = 'swat';
  } else if (stars >= 2 && world.rng() < 0.52) {
    kind = 'interceptor';
  }

  const preferBehind = world.rng() < 0.58;
  const candidateYOffsets = preferBehind
    ? [-680, 1080, -820, 1280]
    : [1080, -680, 1280, -820];
  const shuffledLanes = [0, 1, 2, 3].sort(() => world.rng() - 0.5);

  let chosenLaneX: number | null = null;
  let chosenY: number | null = null;

  for (const yOff of candidateYOffsets) {
    const testY = world.player.worldY + yOff;
    // Keep newly spawned cops far apart vertically from existing cops
    const tooCloseToCopY = activeCops.some((c) => Math.abs(c.worldY - testY) < 320);
    if (tooCloseToCopY) continue;

    for (const lane of shuffledLanes) {
      const testX = LANE_CENTERS[lane];
      const blockedByTraffic = world.traffic.some(
        (t) =>
          !t.wrecked &&
          Math.abs(t.laneX - testX) < 56 &&
          Math.abs(t.worldY - testY) < 175
      );
      const blockedByHazard = world.hazards.some(
        (h) =>
          !h.triggered &&
          Math.abs(h.laneX - testX) < 70 &&
          Math.abs(h.worldY - testY) < 150
      );
      if (!blockedByTraffic && !blockedByHazard) {
        chosenLaneX = testX;
        chosenY = testY;
        break;
      }
    }
    if (chosenLaneX !== null) break;
  }

  // Wait for clear space rather than stacking on another car
  if (chosenLaneX === null || chosenY === null) return;

  const spawnBehind = chosenY < world.player.worldY;
  const hp =
    kind === 'army_car'
      ? 145
      : kind === 'swat'
      ? 125
      : kind === 'interceptor'
      ? 95
      : 78;

  world.cops.push({
    id: world.nextEntityId++,
    kind,
    laneX: chosenLaneX,
    worldY: chosenY,
    speed: spawnBehind ? world.player.speed + 155 : world.player.speed * 0.78,
    vx: 0,
    width: kind === 'swat' || kind === 'army_car' ? 42 : 36,
    length: kind === 'swat' || kind === 'army_car' ? 78 : 68,
    hp,
    maxHp: hp,
    targetLaneX: chosenLaneX,
    aiPhase: world.rng() * Math.PI * 2,
    turretAngle: spawnBehind ? 0 : Math.PI,
    fireCooldown: 2.3 + world.rng() * 1.5,
    lockLaneX: null,
    lockWorldY: null,
    wrecked: false,
    spin: 0,
    spinVel: 0,
    hitFlash: 0,
    alpha: 1,
  });
}

function spawnBoat(world: EngineWorld): void {
  if (world.score.wantedLevel < 5) return;
  if (world.boats.length >= 2) return;

  const distMeters = Math.max(0, world.player.worldY / PX_PER_METER);
  const district = Math.floor(distMeters / 1500) % 3;
  // District 1 (Keys Causeway) has water on both left and right; Districts 0 & 2 have sea/bay on the left
  const side: 'left' | 'right' =
    district === 1 && world.boats.some((b) => b.side === 'left') ? 'right' : 'left';
  const laneX = side === 'left' ? -335 - world.rng() * 45 : 335 + world.rng() * 45;
  const spawnAhead = world.boats.length === 0 || world.rng() < 0.65;

  world.boats.push({
    id: world.nextEntityId++,
    side,
    laneX,
    worldY: world.player.worldY + (spawnAhead ? 780 : -460),
    speed: world.player.speed + (spawnAhead ? -100 : 180),
    vx: 0,
    turretAngle: side === 'left' ? Math.PI * 0.5 : -Math.PI * 0.5,
    fireCooldown: 2.8 + world.rng() * 1.4,
    lockLaneX: null,
    lockWorldY: null,
    disengaging: false,
  });
}

const WANTED_THRESHOLDS = [0, 18, 60, 125, 215, 330];

function computeWantedLevel(points: number): number {
  let lvl = 0;
  for (let i = 1; i < WANTED_THRESHOLDS.length; i++) {
    if (points >= WANTED_THRESHOLDS[i]) {
      lvl = i;
    }
  }
  return lvl;
}

function commitOffense(
  world: EngineWorld,
  label: string,
  pts: number,
  sound: SoundEngine,
  showPopup = true
): void {
  world.rules.cleanTimer = 0;
  world.rules.coolingDown = false;
  const prevLevel = world.score.wantedLevel;
  world.score.wantedPoints = Math.min(460, world.score.wantedPoints + pts);
  const nextLevel = computeWantedLevel(world.score.wantedPoints);

  if (nextLevel > prevLevel) {
    world.score.wantedLevel = nextLevel;
    if (nextLevel > world.score.peakStars) {
      world.score.peakStars = nextLevel;
    }
    sound.playStarUp();
    const banner =
      nextLevel === 5
        ? '★5 ARMY TANK & MISSILES!'
        : nextLevel === 4
        ? '★4 ARMY & CHOPPER ROCKETS!'
        : nextLevel === 3
        ? '★3 CHOPPER & SWAT!'
        : `WANTED ★${nextLevel}`;
    addPopup(world, world.player.laneX, world.player.worldY + 70, banner, '#FF5E7E');
    world.shakeIntensity = Math.max(world.shakeIntensity, 6);
    // Immediate patrol response when first star is triggered
    if (prevLevel === 0) {
      world.nextCopSpawnTime = Math.min(world.nextCopSpawnTime, world.time + 0.6);
    }
  } else if (showPopup) {
    sound.playOffenseAlert();
    addPopup(world, world.player.laneX, world.player.worldY + 52, label, '#FB923C');
  }
}

export function stepEngine(
  world: EngineWorld,
  rawDt: number,
  input: InputState,
  sound: SoundEngine,
  onEnd: (summary: RunSummary) => void
): void {
  if (world.finished) return;

  const dt = Math.min(rawDt, 0.05);
  world.time += dt;

  if (world.blast.active) {
    stepBlastSequence(world, dt, onEnd);
    return;
  }

  // Hitstop freeze frame for heavy impacts
  if (world.hitstopTimer > 0) {
    world.hitstopTimer = Math.max(0, world.hitstopTimer - dt);
    world.shakeIntensity = Math.max(0, world.shakeIntensity - dt * 28);
    return;
  }

  const spec = CARS[world.carId];
  const p = world.player;

  // Timers
  p.hitFlash = Math.max(0, p.hitFlash - dt);
  p.invulnTimer = Math.max(0, p.invulnTimer - dt);
  if (p.armorTimer > 0) {
    p.armorTimer = Math.max(0, p.armorTimer - dt);
    p.bustMeter = 0;
  }
  const isBeast = p.armorTimer > 0;
  for (let i = p.pickupEffects.length - 1; i >= 0; i--) {
    p.pickupEffects[i].timer += dt;
    if (p.pickupEffects[i].timer >= p.pickupEffects[i].duration) {
      p.pickupEffects.splice(i, 1);
    }
  }
  world.shakeIntensity = Math.max(0, world.shakeIntensity - dt * 32);

  if (world.score.comboTimer > 0) {
    world.score.comboTimer -= dt;
    if (world.score.comboTimer <= 0) {
      world.score.combo = 1;
      world.score.comboTimer = 0;
    }
  }

  world.rules.offenseCooldown = Math.max(0, world.rules.offenseCooldown - dt);
  world.praise.cooldown = Math.max(0, world.praise.cooldown - dt);
  if (world.praise.timer > 0) {
    world.praise.timer = Math.max(0, world.praise.timer - dt);
    if (world.praise.timer === 0) {
      world.praise.text = null;
    }
  }

  const distNow = Math.round(p.worldY / PX_PER_METER);
  if (distNow >= 2500) {
    triggerPraiseOnce(world, 'dist2500', 'Wow! 2.5 km Master Escape!', 'wow');
  } else if (distNow >= 1000) {
    triggerPraiseOnce(world, 'dist1000', 'Great Pace! 1 km Driven!', 'great');
  }

  const healthRatio = p.health / Math.max(1, p.maxHealth);
  if (p.health > 0 && healthRatio <= 0.35) {
    triggerPraiseOnce(world, 'low_health', 'Great Focus! Hang In There!', 'clutch', true);
  }

  // Steering input
  let steer = 0;
  if (input.left) steer -= 1;
  if (input.right) steer += 1;
  if (Math.abs(input.touchSteer) > 0.05) {
    steer = Math.max(-1, Math.min(1, input.touchSteer));
  }

  // Nitro boost (only increases when collecting a Boost Potion!)
  const wantsBoost = input.nitro && p.nitro > 2 && !input.down;
  if (wantsBoost && !p.boosting) {
    sound.playBoost();
  }
  p.boosting = wantsBoost;
  if (p.boosting) {
    p.nitro = Math.max(0, p.nitro - dt * 28);
  }

  // Target longitudinal speed
  const maxSpd = spec.topSpeed * (p.boosting ? 1.32 : 1.0);
  const cruiseSpd = spec.topSpeed * 0.72;
  let targetSpd = cruiseSpd;
  if (input.up || p.boosting) targetSpd = maxSpd;
  if (input.down) targetSpd = spec.topSpeed * 0.36;

  const accelRate = p.boosting ? spec.accel * 1.9 : input.down ? spec.accel * 1.7 : spec.accel;
  if (p.speed < targetSpd) {
    p.speed = Math.min(targetSpd, p.speed + accelRate * dt);
  } else {
    p.speed = Math.max(targetSpd, p.speed - accelRate * 0.85 * dt);
  }

  // Drift physics
  const canDrift = p.airZ <= 0 && p.speed > 260;
  const wasDrifting = p.drifting;
  p.drifting = canDrift && input.drift && Math.abs(steer) > 0.1;

  const lateralMax = (p.drifting ? 495 : 400) * spec.handling;
  const targetVx = steer * lateralMax;
  const grip = p.airZ > 0 ? 3.5 : p.drifting ? 6.5 : 13.5 * spec.driftGrip;
  p.vx += (targetVx - p.vx) * Math.min(1, dt * grip);

  // Centrifugal pull on curving road!
  const roadSlope = getRoadSlope(p.worldY, world.curve);
  const centrifugal = -roadSlope * p.speed * 0.24;
  p.laneX += (p.vx + centrifugal) * dt;

  // Drift charge & release turbo snap
  if (p.drifting) {
    p.driftCharge = Math.min(1.5, p.driftCharge + dt);
    const targetDriftAngle = steer * 0.36;
    p.driftAngle += (targetDriftAngle - p.driftAngle) * Math.min(1, dt * 10);
    if (Math.random() < 0.65) {
      const roadCx = getRoadCenterX(p.worldY, world.curve);
      addParticle(world, {
        x: roadCx + p.laneX - 10,
        y: p.worldY - 26,
        vx: (Math.random() - 0.5) * 40,
        vy: -40 - Math.random() * 50,
        size: 7 + Math.random() * 6,
        color: 'rgba(226, 232, 240, 0.45)',
        life: 0.35,
        maxLife: 0.35,
        kind: 'smoke',
      });
    }
  } else {
    if (wasDrifting && p.driftCharge >= 0.45) {
      // Drift release bonus + Street Drift traffic rule offense!
      const cash = awardHaul(world, 150, true);
      p.speed = Math.min(spec.topSpeed * 1.24, p.speed + 140);
      addPopup(world, p.laneX, p.worldY + 35, `DRIFT +$${cash}`, '#5EEAD4');
      sound.playNearMiss(world.score.combo);
      commitOffense(world, 'STREET DRIFT!', 12, sound, false);
    }
    p.driftCharge = 0;
    p.driftAngle += (0 - p.driftAngle) * Math.min(1, dt * 11);
  }

  p.heading = (p.vx / 480) * 0.28 + p.driftAngle;

  // Advance forward
  p.worldY += p.speed * dt;
  world.score.haul += dt * (p.speed / 28);

  // Traffic Rule Enforcement (Speeding, Wrong/Express Shoulder, Cool-down at 1 star)
  const isSpeeding = p.speed >= spec.topSpeed * 0.93 || p.boosting;
  if (isSpeeding) {
    world.rules.speedingTimer += dt;
    world.rules.cleanTimer = 0;
    if (world.rules.speedingTimer >= 2.4 && world.rules.offenseCooldown <= 0) {
      world.rules.speedingTimer = 0;
      world.rules.offenseCooldown = 1.6;
      commitOffense(world, 'SPEEDING!', 18, sound);
    }
  } else {
    world.rules.speedingTimer = Math.max(0, world.rules.speedingTimer - dt * 0.8);
  }

  if (p.laneX < -120 && p.speed >= spec.topSpeed * 0.78) {
    world.rules.wrongLaneTimer += dt;
    world.rules.cleanTimer = 0;
    if (world.rules.wrongLaneTimer >= 2.2 && world.rules.offenseCooldown <= 0) {
      world.rules.wrongLaneTimer = 0;
      world.rules.offenseCooldown = 1.6;
      commitOffense(world, 'ILLEGAL PASS!', 15, sound);
    }
  } else {
    world.rules.wrongLaneTimer = Math.max(0, world.rules.wrongLaneTimer - dt);
  }

  // Star Removal / Heat Cooldown Technique when playing cleanly without breaking rules
  if (world.score.wantedLevel > 0) {
    if (!isSpeeding && p.laneX >= -120) {
      world.rules.cleanTimer += dt;
      if (world.rules.cleanTimer >= 5.5) {
        world.rules.coolingDown = true;
        const drainRate = world.cops.length === 0 ? 18 : 11;
        world.score.wantedPoints = Math.max(0, world.score.wantedPoints - drainRate * dt);
        const newLevel = computeWantedLevel(world.score.wantedPoints);
        if (newLevel < world.score.wantedLevel) {
          world.score.wantedLevel = newLevel;
          if (newLevel === 0) {
            world.score.wantedPoints = 0;
            world.rules.cleanTimer = 0;
            world.rules.coolingDown = false;
            world.missiles = [];
            for (const b of world.boats) {
              b.disengaging = true;
            }
            addPopup(world, p.laneX, p.worldY + 60, 'ALL CLEAR · ★0', '#34D399');
            triggerPraiseOnce(world, 'heat_cleared', 'Awesome! Clean Escape!', 'warm');
          } else {
            if (newLevel < 5) {
              for (const b of world.boats) {
                b.disengaging = true;
              }
            }
            addPopup(world, p.laneX, p.worldY + 55, `STAR REMOVED · ★${newLevel}`, '#34D399');
          }
        }
      }
    } else {
      world.rules.coolingDown = false;
    }
  } else {
    world.rules.coolingDown = false;
  }

  // Airborne / Jump ramp vertical physics
  if (p.airZ > 0 || p.airVelZ > 0) {
    p.airZ += p.airVelZ * dt;
    p.airVelZ -= 1150 * dt;
    if (p.airZ <= 0) {
      p.airZ = 0;
      p.airVelZ = 0;
      world.shakeIntensity = Math.max(world.shakeIntensity, 5);
      spawnBurst(world, p.laneX, p.worldY - 10, '#FDE68A', 10, 'spark', 0.8);
      const airBonus = awardHaul(world, 350, true);
      addPopup(world, p.laneX, p.worldY + 45, `AIRTIME +$${airBonus}`, '#FBBF24');
    }
  }

  // Guardrail / Shoulder clamping & sparks
  const maxLaneX = ROAD_HALF_WIDTH - 20;
  if (p.laneX < -maxLaneX) {
    p.laneX = -maxLaneX;
    if (p.vx < -90) {
      p.vx = Math.abs(p.vx) * 0.35;
      if (!isBeast) {
        p.health = Math.max(0, p.health - 3);
        p.lastDamageBy = 'Highway Guardrail';
      }
      world.shakeIntensity = Math.max(world.shakeIntensity, 4);
      spawnBurst(world, p.laneX - 14, p.worldY, '#FBBF24', 6, 'spark', 0.6);
      sound.playCrash(false);
      if (world.rules.offenseCooldown <= 0) {
        world.rules.offenseCooldown = 1.4;
        commitOffense(world, 'PROPERTY DAMAGE!', 10, sound);
      }
    } else {
      p.vx = Math.max(0, p.vx);
    }
  } else if (p.laneX > maxLaneX) {
    p.laneX = maxLaneX;
    if (p.vx > 90) {
      p.vx = -Math.abs(p.vx) * 0.35;
      if (!isBeast) {
        p.health = Math.max(0, p.health - 3);
        p.lastDamageBy = 'Highway Guardrail';
      }
      world.shakeIntensity = Math.max(world.shakeIntensity, 4);
      spawnBurst(world, p.laneX + 14, p.worldY, '#FBBF24', 6, 'spark', 0.6);
      sound.playCrash(false);
      if (world.rules.offenseCooldown <= 0) {
        world.rules.offenseCooldown = 1.4;
        commitOffense(world, 'PROPERTY DAMAGE!', 10, sound);
      }
    } else {
      p.vx = Math.min(0, p.vx);
    }
  }

  // Persistent Skid Marks when drifting
  const roadCxNow = getRoadCenterX(p.worldY, world.curve);
  const playerWorldX = roadCxNow + p.laneX;
  const cosH = Math.cos(p.heading);
  const sinH = Math.sin(p.heading);
  const rearOffset = -22;
  const wheelHalf = 13;
  const lwX = playerWorldX + (-wheelHalf * cosH - rearOffset * sinH);
  const lwY = p.worldY + (-wheelHalf * sinH + rearOffset * cosH);
  const rwX = playerWorldX + (wheelHalf * cosH - rearOffset * sinH);
  const rwY = p.worldY + (wheelHalf * sinH + rearOffset * cosH);

  if (p.drifting && p.airZ <= 0) {
    if (world.prevLeftWheelWorld && world.prevRightWheelWorld) {
      if (world.skids.length >= 280) {
        world.skids.splice(0, 2);
      }
      world.skids.push(
        {
          worldX1: world.prevLeftWheelWorld.x,
          worldY1: world.prevLeftWheelWorld.y,
          worldX2: lwX,
          worldY2: lwY,
          alpha: 0.45,
        },
        {
          worldX1: world.prevRightWheelWorld.x,
          worldY1: world.prevRightWheelWorld.y,
          worldX2: rwX,
          worldY2: rwY,
          alpha: 0.45,
        }
      );
    }
    world.prevLeftWheelWorld = { x: lwX, y: lwY };
    world.prevRightWheelWorld = { x: rwX, y: rwY };
  } else {
    world.prevLeftWheelWorld = null;
    world.prevRightWheelWorld = null;
  }

  // Nitro flame trail
  if (p.boosting) {
    for (let f = 0; f < 2; f++) {
      addParticle(world, {
        x: playerWorldX + (f === 0 ? -9 : 9) + (Math.random() - 0.5) * 4,
        y: p.worldY - 32,
        vx: (Math.random() - 0.5) * 35,
        vy: -140 - Math.random() * 120,
        size: 5 + Math.random() * 5,
        color: Math.random() < 0.5 ? '#FF5E7E' : '#38BDF8',
        life: 0.18,
        maxLife: 0.18,
        kind: 'flame',
      });
    }
  }

  // Camera tracks curving road smoothly
  const targetCamX = roadCxNow + p.laneX * 0.28;
  world.cameraWorldX += (targetCamX - world.cameraWorldX) * Math.min(1, dt * 8.5);

  // Spawn Waves using Dynamic Load Balancer
  const bal = computeLoadBalance(world);
  while (world.nextTrafficSpawnY < p.worldY + 1850) {
    spawnTrafficWave(world);
  }
  if (world.score.wantedLevel >= 2 && p.worldY + 1500 > world.nextHazardSpawnY) {
    spawnHazardWave(world);
  }
  if (world.score.wantedLevel >= 1 && world.time >= world.nextCopSpawnTime) {
    spawnCop(world);
    world.nextCopSpawnTime = world.time + bal.copCooldown;
  }

  if (world.score.wantedLevel >= 5 && world.time >= world.nextBoatSpawnTime) {
    spawnBoat(world);
    world.nextBoatSpawnTime = world.time + 4.5;
  }

  // Pursuit Helicopter (Stars >= 3; fires Missiles at Stars >= 4) — no empty tracking circle!
  const chopperStars = world.score.wantedLevel >= 3;
  world.helicopter.active = chopperStars;
  if (chopperStars) {
    world.helicopter.phase += dt * 1.1;
    const targetHeliLane = Math.sin(world.helicopter.phase * 0.85) * 130;
    world.helicopter.laneX += (targetHeliLane - world.helicopter.laneX) * Math.min(1, dt * 2.4);
    world.helicopter.worldYOffset = 255 + Math.cos(world.helicopter.phase * 0.55) * 45;
    world.helicopter.rotorAngle += dt * 24;

    // Air-to-ground Missiles at Stars >= 4 (balanced by health)
    if (world.score.wantedLevel >= 4) {
      world.helicopter.missileCooldown -= dt;
      if (world.helicopter.missileCooldown <= 0) {
        const baseInterval = world.score.wantedLevel >= 5 ? 3.2 : 4.6;
        const healthPause = bal.healthFactor < 0.35 ? 1.5 : 0;
        world.helicopter.missileCooldown = baseInterval + healthPause + world.rng() * 1.2;

        const targetLane = p.laneX + (world.rng() - 0.5) * 30;
        const clampedTargetLane = Math.max(
          -ROAD_HALF_WIDTH + 28,
          Math.min(ROAD_HALF_WIDTH - 28, targetLane)
        );
        const fuse = 1.2;
        const startY = p.worldY + world.helicopter.worldYOffset;
        world.missiles.push({
          id: world.nextEntityId++,
          source: 'chopper',
          startLaneX: world.helicopter.laneX,
          startWorldY: startY,
          laneX: world.helicopter.laneX,
          worldY: startY,
          targetLaneX: clampedTargetLane,
          targetWorldY: p.worldY + p.speed * 0.96,
          speed: p.speed,
          fuseTimer: fuse,
          maxFuse: fuse,
          exploded: false,
        });
        sound.playMissileLaunch();
        addPopup(world, clampedTargetLane, p.worldY + 135, 'MISSILE LOCK!', '#EF4444');
      }
    }
  }

  // Update Traffic & Collisions
  const playerW = 34;
  const playerL = 66;
  let copNearPlayer = false;

  for (let i = world.traffic.length - 1; i >= 0; i--) {
    const t = world.traffic[i];
    if (t.wrecked) {
      t.laneX += t.vx * dt;
      t.worldY += t.vy * dt;
      t.spin += t.spinVel * dt;
      t.alpha -= dt * 1.1;
      if (t.alpha <= 0) {
        world.traffic.splice(i, 1);
      }
      continue;
    }

    t.worldY += t.speed * dt;
    if (t.worldY < p.worldY - 700 || t.worldY > p.worldY + 2400) {
      world.traffic.splice(i, 1);
      continue;
    }

    // Prevent traffic cars from overlapping or ghosting invisibly through each other
    if (t.kind !== 'ramp') {
      for (let j = 0; j < world.traffic.length; j++) {
        if (i === j) continue;
        const other = world.traffic[j];
        if (other.wrecked || other.kind === 'ramp') continue;
        const tdx = Math.abs(t.laneX - other.laneX);
        const minW = (t.width + other.width) * 0.52;
        if (tdx < minW && other.worldY > t.worldY) {
          const gapY = other.worldY - t.worldY;
          const minL = (t.length + other.length) * 0.52;
          if (gapY < minL + 42) {
            t.speed = Math.min(t.speed, other.speed * 0.96);
          }
          if (gapY < minL) {
            t.worldY = other.worldY - minL - 2;
          }
        }
      }
    }

    const dx = Math.abs(p.laneX - t.laneX);
    const dy = Math.abs(p.worldY - t.worldY);
    const hitW = (playerW + t.width) * 0.45;
    const hitL = (playerL + t.length) * 0.45;

    // Check Jump Ramp launch
    if (t.kind === 'ramp' && p.airZ <= 8 && dx < hitW + 6 && dy < hitL + 10) {
      p.airVelZ = 470;
      p.airZ = 4;
      p.speed = Math.max(p.speed, spec.topSpeed * 1.12);
      sound.playRamp();
      addPopup(world, p.laneX, p.worldY + 50, 'LAUNCH!', '#F59E0B');
      continue;
    }

    // Ignore traffic collisions while flying airborne!
    if (p.airZ > 16) continue;

    // Near Miss detection (clean driving boosts star cooldown slightly!)
    if (
      !t.nearMissed &&
      dy < hitL + 18 &&
      dx >= hitW &&
      dx < hitW + 34 &&
      p.speed > t.speed + 90
    ) {
      t.nearMissed = true;
      world.score.nearMisses++;
      if (world.score.wantedLevel > 0) {
        world.rules.cleanTimer += 1.4;
        if (world.rules.coolingDown) {
          world.score.wantedPoints = Math.max(0, world.score.wantedPoints - 4);
        }
      }
      const cash = awardHaul(world, 200, true);
      if (p.health / Math.max(1, p.maxHealth) <= 0.45) {
        triggerPraiseOnce(world, 'low_health_dodge', 'Wow! Clutch Save!', 'wow', true);
      }
      sound.playNearMiss(world.score.combo);
      addPopup(world, (p.laneX + t.laneX) * 0.5, p.worldY + 30, `NEAR MISS +$${cash}`, '#2DD4BF');
      spawnBurst(world, (p.laneX + t.laneX) * 0.5, p.worldY, '#2DD4BF', 6, 'spark', 0.5);
    }

    // Collision -> Rules Offense (Beast Smash / Nitro Ramming / Hit & Run)
    if (dx < hitW && dy < hitL) {
      const trafficLabel =
        t.kind === 'truck' ? 'Heavy Truck' : t.kind === 'van' ? 'Traffic Van' : 'Traffic Car';
      if (isBeast) {
        t.wrecked = true;
        t.vx = (t.laneX >= p.laneX ? 1 : -1) * 420;
        t.vy = p.speed * 0.95;
        t.spinVel = (t.laneX >= p.laneX ? 1 : -1) * 11;
        const cash = awardHaul(world, 150, false);
        world.shakeIntensity = Math.max(world.shakeIntensity, 7);
        sound.playCrash(true);
        spawnBurst(world, t.laneX, t.worldY, '#FACC15', 14, 'spark', 1.2);
        spawnBurst(world, t.laneX, t.worldY, '#FF5A36', 10, 'debris', 1.0);
        addPopup(world, t.laneX, t.worldY + 30, `BEAST SMASH +$${cash}`, '#FACC15');
        commitOffense(world, 'BEAST RAMMING!', 16, sound, false);
      } else if (p.boosting && t.kind !== 'truck') {
        t.wrecked = true;
        t.vx = (t.laneX >= p.laneX ? 1 : -1) * 340;
        t.vy = p.speed * 0.85;
        t.spinVel = (t.laneX >= p.laneX ? 1 : -1) * 8;
        p.health = Math.max(0, p.health - 6);
        p.lastDamageBy = trafficLabel;
        world.hitstopTimer = 0.032;
        world.shakeIntensity = 9;
        sound.playCrash(true);
        spawnBurst(world, t.laneX, t.worldY, '#FF5A36', 14, 'debris', 1.1);
        commitOffense(world, 'RECKLESS RAM!', 26, sound);
      } else if (p.invulnTimer <= 0) {
        const heavy = t.kind === 'truck' || p.speed - t.speed > 320;
        const dmg = heavy ? 18 : 11;
        p.health = Math.max(0, p.health - dmg);
        p.lastDamageBy = trafficLabel;
        p.hitFlash = 0.22;
        p.invulnTimer = 0.42;
        p.speed = Math.max(240, t.speed * 0.85);
        p.vx = (p.laneX >= t.laneX ? 1 : -1) * 260;
        world.score.combo = 1;
        world.score.comboTimer = 0;
        world.hitstopTimer = 0.035;
        world.shakeIntensity = heavy ? 12 : 8;
        sound.playCrash(heavy);
        spawnBurst(world, (p.laneX + t.laneX) * 0.5, (p.worldY + t.worldY) * 0.5, '#F8FAFC', 12, 'spark', 0.9);
        commitOffense(
          world,
          t.kind === 'truck' ? 'TRUCK SMASH!' : 'HIT & RUN!',
          t.kind === 'truck' ? 30 : 22,
          sound
        );
      }
    }
  }

  // Update Intelligent Police & Takedowns (spaced apart, obstacle-avoiding, real colliders)
  const activeCopIds = world.cops.filter((cop) => !cop.wrecked).map((cop) => cop.id);
  const FORMATION_Y_OFFSETS = [215, -175, 55];

  for (let i = world.cops.length - 1; i >= 0; i--) {
    const c = world.cops[i];
    c.hitFlash = Math.max(0, c.hitFlash - dt);

    if (c.wrecked) {
      c.laneX += c.vx * dt;
      c.worldY += c.speed * dt;
      c.speed *= Math.max(0, 1 - dt * 1.8);
      c.spin += c.spinVel * dt;
      c.alpha -= dt * 0.75;
      if (c.alpha <= 0) {
        world.cops.splice(i, 1);
      }
      continue;
    }

    const relY = c.worldY - p.worldY;
    if (relY < -950 || relY > 1550) {
      world.cops.splice(i, 1);
      continue;
    }

    if (world.score.wantedLevel === 0) {
      // Peace restored: police peel back cleanly behind the player
      c.speed = Math.max(120, p.speed * 0.45);
      c.worldY += c.speed * dt;
      if (c.worldY < p.worldY - 650) {
        world.cops.splice(i, 1);
      }
      continue;
    }

    const isArmy = c.kind === 'army_car';
    const slotIdx = Math.max(0, activeCopIds.indexOf(c.id));
    const desiredOffsetY = FORMATION_Y_OFFSETS[slotIdx % FORMATION_Y_OFFSETS.length];

    // Intelligent Lane & Obstacle Evaluation: avoid traffic, hazards, and fellow cops; flank or attack player cleanly
    const anotherCopNearPlayerLane = world.cops.some(
      (other) =>
        other.id !== c.id &&
        !other.wrecked &&
        Math.abs(other.laneX - p.laneX) < 62 &&
        Math.abs(other.worldY - p.worldY) < 230
    );

    let bestLaneX = c.laneX;
    let bestCost = Infinity;
    let blockedDirectlyAhead = false;
    let aheadBlockerSpeed = c.speed;

    for (const candidateX of LANE_CENTERS) {
      let cost = 0;

      // Avoid civilian traffic ahead/beside
      for (const t of world.traffic) {
        if (t.wrecked) continue;
        if (Math.abs(t.laneX - candidateX) < (c.width + t.width) * 0.68) {
          const dyT = t.worldY - c.worldY;
          if (dyT > -75 && dyT < 290) {
            cost += 1200 - Math.max(0, dyT) * 2.0;
          }
        }
      }

      // Avoid roadblocks & spike strips
      for (const h of world.hazards) {
        if (h.triggered) continue;
        if (Math.abs(h.laneX - candidateX) < 76) {
          const dyH = h.worldY - c.worldY;
          if (dyH > -45 && dyH < 300) {
            cost += 1450;
          }
        }
      }

      // Keep wide separation from other police cars so they stay far apart & don't overlap
      for (const other of world.cops) {
        if (other.id === c.id || other.wrecked) continue;
        const dyCop = Math.abs(other.worldY - c.worldY);
        const dxCop = Math.abs(other.laneX - candidateX);
        if (dyCop < 290 && dxCop < 82) {
          cost += 950;
        }
      }

      // Attack / Flanking logic
      const inAttackWindow = Math.abs(relY) < 280;
      if (anotherCopNearPlayerLane && !inAttackWindow) {
        cost += Math.abs(Math.abs(candidateX - p.laneX) - LANE_WIDTH) * 0.95;
      } else {
        cost += Math.abs(candidateX - p.laneX) * (inAttackWindow ? 1.25 : 0.85);
      }

      // Slight hysteresis to keep steering smooth
      if (Math.abs(candidateX - c.laneX) < 32) {
        cost -= 28;
      }

      if (cost < bestCost) {
        bestCost = cost;
        bestLaneX = candidateX;
      }
    }

    // Check immediate forward blocker in current lane so cop slows cleanly while changing lanes
    for (const t of world.traffic) {
      if (t.wrecked || t.kind === 'ramp') continue;
      const dyT = t.worldY - c.worldY;
      if (Math.abs(t.laneX - c.laneX) < (c.width + t.width) * 0.54 && dyT > 0 && dyT < 165) {
        blockedDirectlyAhead = true;
        aheadBlockerSpeed = Math.min(aheadBlockerSpeed, t.speed);
      }
    }
    for (const other of world.cops) {
      if (other.id === c.id || other.wrecked) continue;
      const dyCop = other.worldY - c.worldY;
      if (Math.abs(other.laneX - c.laneX) < 58 && dyCop > 0 && dyCop < 210) {
        blockedDirectlyAhead = true;
        aheadBlockerSpeed = Math.min(aheadBlockerSpeed, other.speed - 45);
      }
    }

    // When clear and aligned near the player, target player's exact X to attack/ram; otherwise steer along clear lane
    const laneClearToAttack =
      Math.abs(bestLaneX - p.laneX) < 55 && Math.abs(relY) < 230 && !blockedDirectlyAhead;
    c.targetLaneX = laneClearToAttack ? p.laneX : bestLaneX;

    let targetSpeed =
      relY < desiredOffsetY - 45
        ? p.speed + (c.kind === 'interceptor' || c.kind === 'army_car' ? 210 : 175) * bal.copAggression
        : relY > desiredOffsetY + 95
        ? Math.max(210, p.speed - 145)
        : p.speed + 16 * bal.copAggression;

    // Aggressive attack burst when behind player with open lane
    if (laneClearToAttack && relY < -35 && relY > -220) {
      targetSpeed = Math.max(targetSpeed, p.speed + 185 * bal.copAggression);
    }

    if (blockedDirectlyAhead) {
      targetSpeed = Math.min(targetSpeed, Math.max(180, aheadBlockerSpeed - 30));
    }

    c.speed += (targetSpeed - c.speed) * Math.min(1, dt * 4.2);
    c.worldY += c.speed * dt;

    const pursueStrength = (c.kind === 'swat' || isArmy ? 4.4 : 3.6) * bal.copAggression;
    const laneDiff = c.targetLaneX - c.laneX;
    c.vx +=
      (Math.max(-310, Math.min(310, laneDiff * 3.5)) - c.vx) *
      Math.min(1, dt * pursueStrength);
    c.laneX = Math.max(-ROAD_HALF_WIDTH + 22, Math.min(ROAD_HALF_WIDTH - 22, c.laneX + c.vx * dt));

    // Army Gun Truck Rockets (Stars >= 4)
    if (c.kind === 'army_car' && world.score.wantedLevel >= 4 && Math.abs(relY) < 560) {
      c.fireCooldown -= dt;
      if (c.fireCooldown <= 0) {
        c.fireCooldown = bal.healthFactor < 0.35 ? 5.2 : 4.0;
        const firedFromBehind = c.worldY < p.worldY;
        const rocketSpeed = firedFromBehind ? p.speed + 320 : p.speed * 0.25 - 120;
        const sy = c.worldY + (firedFromBehind ? 46 : -48);
        world.missiles.push({
          id: world.nextEntityId++,
          source: 'army',
          startLaneX: c.laneX,
          startWorldY: sy,
          laneX: c.laneX,
          worldY: sy,
          targetLaneX: c.laneX,
          targetWorldY: p.worldY,
          speed: rocketSpeed,
          fuseTimer: 2.6,
          maxFuse: 2.6,
          exploded: false,
        });
        sound.playMissileLaunch();
        addPopup(world, c.laneX, c.worldY + 42, 'ROCKET FIRED!', '#F97316');
      }
    }

    // Cop <-> Traffic real collider (cops cannot pass invisibly through traffic)
    for (const t of world.traffic) {
      if (t.wrecked || t.kind === 'ramp') continue;
      const tdx = Math.abs(c.laneX - t.laneX);
      const tdy = Math.abs(c.worldY - t.worldY);
      const tHitW = (c.width + t.width) * 0.46;
      const tHitL = (c.length + t.length) * 0.46;
      if (tdx < tHitW && tdy < tHitL) {
        const pushDir = c.laneX >= t.laneX ? 1 : -1;
        c.laneX = Math.max(-ROAD_HALF_WIDTH + 22, Math.min(ROAD_HALF_WIDTH - 22, c.laneX + pushDir * 14));
        c.vx = pushDir * 220;
        c.speed = Math.max(180, t.speed * 0.85);
        c.hp -= t.kind === 'truck' ? 56 : 26;
        c.hitFlash = 0.16;

        t.wrecked = true;
        t.vx = -pushDir * 280;
        t.vy = c.speed * 0.72;
        t.spinVel = -pushDir * 8.5;
        sound.playCrash(t.kind === 'truck');
        spawnBurst(world, (c.laneX + t.laneX) * 0.5, (c.worldY + t.worldY) * 0.5, '#F8FAFC', 10, 'spark', 0.9);

        if (c.hp <= 0) {
          c.wrecked = true;
          c.vx = pushDir * 320;
          c.spinVel = pushDir * 8.5;
          world.score.copsWrecked++;
          const cash = awardHaul(world, 600, true);
          sound.playCopWreck();
          spawnBurst(world, c.laneX, c.worldY, '#FF5E7E', 16, 'debris', 1.15);
          addPopup(world, c.laneX, c.worldY + 35, `TRAFFIC CRASH +$${cash}`, '#FFB347');
          break;
        }
      }
    }
    if (c.wrecked) continue;

    const copLabel =
      c.kind === 'army_car'
        ? 'Army Gun Truck'
        : c.kind === 'swat'
        ? 'SWAT Van'
        : c.kind === 'interceptor'
        ? 'Police Interceptor'
        : 'Police Cruiser';

    const dx = Math.abs(p.laneX - c.laneX);
    const dy = Math.abs(p.worldY - c.worldY);
    if (dx < 95 && dy < 110) {
      copNearPlayer = true;
      p.lastBusterBy = copLabel;
    }

    if (p.airZ > 16) continue;

    const hitW = (playerW + c.width) * 0.47;
    const hitL = (playerL + c.length) * 0.47;
    if (dx < hitW && dy < hitL) {
      const playerAttackPower = isBeast
        ? 260
        : (p.boosting ? 80 : 0) +
          (Math.abs(p.driftAngle) > 0.16 ? 55 : 0) +
          (Math.abs(p.vx) > 220 ? 45 : 22);

      c.hp -= playerAttackPower;
      c.hitFlash = 0.18;
      const pushDir = c.laneX >= p.laneX ? 1 : -1;
      c.vx = pushDir * 360;
      c.laneX += pushDir * 14;

      if (c.hp <= 0) {
        c.wrecked = true;
        c.vx = pushDir * 390;
        c.spinVel = pushDir * 9.5;
        world.score.copsWrecked++;
        if (world.score.copsWrecked >= 5) {
          triggerPraiseOnce(world, 'wrecks5', 'Wow! 5 Pursuers Down!', 'wow');
        } else if (world.score.copsWrecked === 1) {
          triggerPraiseOnce(world, 'wreck1', 'Great Takedown!', 'great');
        }
        const baseBounty = c.kind === 'army_car' ? 1800 : 1000;
        const cash = awardHaul(world, baseBounty, true);
        world.hitstopTimer = 0.048;
        world.shakeIntensity = isArmy ? 16 : 14;
        sound.playCopWreck();
        spawnBurst(world, c.laneX, c.worldY, '#FF5E7E', 20, 'debris', 1.3);
        spawnBurst(world, c.laneX, c.worldY, '#FDE68A', 16, 'spark', 1.4);
        addPopup(
          world,
          c.laneX,
          c.worldY + 40,
          c.kind === 'army_car' ? `ARMY WRECKED +$${cash}` : `TAKEDOWN +$${cash}`,
          '#FFB347'
        );
        commitOffense(
          world,
          isArmy ? 'MILITARY DESTROYED!' : 'COP WRECKED!',
          isArmy ? 42 : 30,
          sound,
          false
        );
      } else if (!isBeast && p.invulnTimer <= 0) {
        const dmg = c.kind === 'army_car' || c.kind === 'swat' ? 14 : 9;
        p.health = Math.max(0, p.health - dmg);
        p.lastDamageBy = copLabel;
        p.hitFlash = 0.18;
        p.invulnTimer = 0.35;
        p.vx = -pushDir * 240;
        world.shakeIntensity = 9;
        sound.playCrash(false);
        spawnBurst(world, (p.laneX + c.laneX) * 0.5, p.worldY, '#38BDF8', 10, 'spark', 0.9);
      }
    }
  }

  // Cop <-> Cop Collider: if two police cars collide or occupy the same spot, they crash & wreck!
  for (let i = 0; i < world.cops.length; i++) {
    const a = world.cops[i];
    if (a.wrecked) continue;
    for (let j = i + 1; j < world.cops.length; j++) {
      const b = world.cops[j];
      if (b.wrecked) continue;
      const dx = Math.abs(a.laneX - b.laneX);
      const dy = Math.abs(a.worldY - b.worldY);
      const hitW = (a.width + b.width) * 0.48;
      const hitL = (a.length + b.length) * 0.48;
      if (dx < hitW && dy < hitL) {
        const pushX = a.laneX >= b.laneX ? 1 : -1;
        const pushY = a.worldY >= b.worldY ? 1 : -1;
        const sepX = Math.max(10, (hitW - dx) * 0.65);
        const sepY = Math.max(12, (hitL - dy) * 0.65);

        if (dx > dy * 0.5) {
          a.laneX = Math.max(-ROAD_HALF_WIDTH + 22, Math.min(ROAD_HALF_WIDTH - 22, a.laneX + pushX * sepX));
          b.laneX = Math.max(-ROAD_HALF_WIDTH + 22, Math.min(ROAD_HALF_WIDTH - 22, b.laneX - pushX * sepX));
        } else {
          a.worldY += pushY * sepY;
          b.worldY -= pushY * sepY;
        }

        a.vx = pushX * 290;
        b.vx = -pushX * 290;
        a.hp -= 52;
        b.hp -= 52;
        a.hitFlash = 0.2;
        b.hitFlash = 0.2;

        sound.playCrash(true);
        spawnBurst(world, (a.laneX + b.laneX) * 0.5, (a.worldY + b.worldY) * 0.5, '#FACC15', 14, 'spark', 1.1);

        for (const [cop, dir] of [
          [a, pushX],
          [b, -pushX],
        ] as const) {
          if (cop.hp <= 0 && !cop.wrecked) {
            cop.wrecked = true;
            cop.vx = dir * 340;
            cop.spinVel = dir * 9;
            world.score.copsWrecked++;
            const cash = awardHaul(world, 650, true);
            sound.playCopWreck();
            spawnBurst(world, cop.laneX, cop.worldY, '#FF5E7E', 18, 'debris', 1.2);
            addPopup(world, cop.laneX, cop.worldY + 35, `COP CRASH +$${cash}`, '#FFB347');
          }
        }
      }
    }
  }

  // Update 5-Star Sea Gunboats
  for (let i = world.boats.length - 1; i >= 0; i--) {
    const b = world.boats[i];
    if (b.disengaging || world.score.wantedLevel < 5) {
      b.disengaging = true;
      b.laneX += (b.side === 'left' ? -220 : 220) * dt;
      b.worldY += p.speed * 0.45 * dt;
      if (Math.abs(b.laneX) > 650 || b.worldY < p.worldY - 700) {
        world.boats.splice(i, 1);
      }
      continue;
    }

    const relY = b.worldY - p.worldY;
    const desiredBoatY = b.id % 2 === 0 ? 150 : -60;
    const targetBoatSpeed =
      relY < desiredBoatY - 40
        ? p.speed + 195
        : relY > desiredBoatY + 80
        ? Math.max(180, p.speed - 150)
        : p.speed + 8;
    b.speed += (targetBoatSpeed - b.speed) * Math.min(1, dt * 3.2);
    b.worldY += b.speed * dt;

    // Gentle wave sway
    const desiredWaterX = (b.side === 'left' ? -335 : 335) + Math.sin(world.time * 1.9 + b.id) * 18;
    b.laneX += (desiredWaterX - b.laneX) * Math.min(1, dt * 3.0);

    // Track player with gunboat turret
    const aimX = b.lockLaneX ?? p.laneX;
    const aimY = b.lockWorldY ?? p.worldY;
    const desiredTurret = Math.atan2(aimX - b.laneX, aimY - b.worldY);
    const tDiff = Math.atan2(Math.sin(desiredTurret - b.turretAngle), Math.cos(desiredTurret - b.turretAngle));
    b.turretAngle += tDiff * Math.min(1, dt * 6.5);

    b.fireCooldown -= dt;
    if (b.fireCooldown <= 0.7 && b.lockLaneX === null) {
      b.lockLaneX = Math.max(-ROAD_HALF_WIDTH + 30, Math.min(ROAD_HALF_WIDTH - 30, p.laneX));
      b.lockWorldY = p.worldY + p.speed * 1.05;
    }
    if (b.fireCooldown <= 0) {
      const targetX = b.lockLaneX ?? Math.max(-ROAD_HALF_WIDTH + 30, Math.min(ROAD_HALF_WIDTH - 30, p.laneX));
      const targetY = b.lockWorldY ?? p.worldY + p.speed * 1.05;
      b.lockLaneX = null;
      b.lockWorldY = null;
      b.fireCooldown = (bal.healthFactor < 0.35 ? 5.0 : 3.7) + world.rng() * 0.9;

      const fuse = 1.12;
      world.missiles.push({
        id: world.nextEntityId++,
        source: 'boat',
        startLaneX: b.laneX,
        startWorldY: b.worldY,
        laneX: b.laneX,
        worldY: b.worldY,
        targetLaneX: targetX,
        targetWorldY: targetY,
        speed: 0,
        fuseTimer: fuse,
        maxFuse: fuse,
        exploded: false,
      });
      sound.playMissileLaunch();
      spawnBurst(world, b.laneX, b.worldY, '#FDE68A', 8, 'spark', 0.8);
      addPopup(world, targetX, p.worldY + 125, 'BOAT SHELL!', '#38BDF8');
    }
  }

  // Update Incoming Missiles, Boat Shells & Rockets
  for (let i = world.missiles.length - 1; i >= 0; i--) {
    const m = world.missiles[i];
    if (m.source === 'chopper' || m.source === 'boat') {
      m.fuseTimer -= dt;
      const progress = Math.max(0, Math.min(1, 1 - m.fuseTimer / m.maxFuse));
      const startX = m.source === 'chopper' ? world.helicopter.laneX : m.startLaneX;
      const startY = m.source === 'chopper' ? p.worldY + world.helicopter.worldYOffset : m.startWorldY;
      m.laneX = startX + (m.targetLaneX - startX) * progress;
      m.worldY = startY + (m.targetWorldY - startY) * progress;

      if (Math.random() < 0.65) {
        const rx = getRoadCenterX(m.worldY, world.curve) + m.laneX;
        addParticle(world, {
          x: rx,
          y: m.worldY,
          vx: (Math.random() - 0.5) * 30,
          vy: -50,
          size: 4 + Math.random() * 3,
          color: m.source === 'boat' ? '#38BDF8' : '#F97316',
          life: 0.24,
          maxLife: 0.24,
          kind: 'smoke',
        });
      }

      if (m.fuseTimer <= 0) {
        // Detonation!
        sound.playCrash(true);
        world.shakeIntensity = Math.max(world.shakeIntensity, 15);
        spawnBurst(world, m.targetLaneX, m.targetWorldY, '#FFFFFF', 12, 'spark', 1.35);
        spawnBurst(world, m.targetLaneX, m.targetWorldY, '#FF5A36', 20, 'flame', 1.45);
        spawnBurst(world, m.targetLaneX, m.targetWorldY, '#475569', 14, 'smoke', 1.0);

        const distToPlayer = Math.hypot(p.laneX - m.targetLaneX, p.worldY - m.targetWorldY);
        const hitRadius = 48;
        if (distToPlayer < hitRadius && p.airZ <= 18 && isBeast) {
          spawnBurst(world, p.laneX, p.worldY, '#FACC15', 12, 'spark', 1.1);
          addPopup(world, p.laneX, p.worldY + 42, 'ARMOR BLOCKED!', '#FACC15');
        } else if (distToPlayer < hitRadius && p.airZ <= 18 && p.invulnTimer <= 0) {
          const baseDmg = 22;
          const mDmg = bal.healthFactor < 0.35 ? Math.round(baseDmg * 0.72) : baseDmg;
          p.health = Math.max(0, p.health - mDmg);
          p.lastDamageBy = m.source === 'boat' ? 'Sea Gunboat Shell' : 'Helicopter Missile';
          p.hitFlash = 0.26;
          p.invulnTimer = 0.45;
          world.hitstopTimer = 0.04;
          addPopup(
            world,
            p.laneX,
            p.worldY + 42,
            m.source === 'boat' ? 'SHELL HIT!' : 'MISSILE HIT!',
            '#EF4444'
          );
        } else if (distToPlayer < 220) {
          const dodgeCash = awardHaul(world, 220, true);
          triggerPraiseOnce(world, 'bomb_dodge', 'Awesome Dodge! Pure Reflex!', 'awesome', true);
          addPopup(world, p.laneX, p.worldY + 42, `DODGED +$${dodgeCash}`, '#2DD4BF');
        }

        // Collateral damage to nearby traffic
        for (const t of world.traffic) {
          if (!t.wrecked && Math.hypot(t.laneX - m.targetLaneX, t.worldY - m.targetWorldY) < 76) {
            t.wrecked = true;
            t.vx = (t.laneX >= m.targetLaneX ? 1 : -1) * 290;
            t.vy = t.speed * 0.7;
            t.spinVel = 7;
          }
        }
        world.missiles.splice(i, 1);
      }
    } else {
      // Army ground rocket traveling along highway lane
      m.fuseTimer -= dt;
      m.worldY += m.speed * dt;
      if (Math.random() < 0.7) {
        const rx = getRoadCenterX(m.worldY, world.curve) + m.laneX;
        addParticle(world, {
          x: rx,
          y: m.worldY,
          vx: (Math.random() - 0.5) * 25,
          vy: -40,
          size: 4 + Math.random() * 3,
          color: Math.random() < 0.55 ? '#FACC15' : '#94A3B8',
          life: 0.22,
          maxLife: 0.22,
          kind: 'flame',
        });
      }

      if (m.fuseTimer <= 0 || m.worldY < p.worldY - 500 || m.worldY > p.worldY + 1400) {
        world.missiles.splice(i, 1);
        continue;
      }

      const dx = Math.abs(p.laneX - m.laneX);
      const dy = Math.abs(p.worldY - m.worldY);
      if (dx < 26 && dy < 40 && p.airZ <= 14 && (isBeast || p.invulnTimer <= 0)) {
        if (isBeast) {
          sound.playCrash(false);
          spawnBurst(world, m.laneX, m.worldY, '#FACC15', 14, 'spark', 1.1);
          addPopup(world, p.laneX, p.worldY + 40, 'ARMOR BLOCKED!', '#FACC15');
          world.missiles.splice(i, 1);
        } else {
          const rDmg = bal.healthFactor < 0.35 ? 14 : 20;
          p.health = Math.max(0, p.health - rDmg);
          p.lastDamageBy = 'Army Rocket';
          p.hitFlash = 0.22;
          p.invulnTimer = 0.4;
          world.hitstopTimer = 0.038;
          world.shakeIntensity = Math.max(world.shakeIntensity, 14);
          sound.playCrash(true);
          spawnBurst(world, m.laneX, m.worldY, '#FF5A36', 18, 'flame', 1.3);
          addPopup(world, p.laneX, p.worldY + 40, 'ROCKET HIT!', '#EF4444');
          world.missiles.splice(i, 1);
        }
      }
    }
  }

  // Bust Meter check (pinned at very low speed near a cop; impossible while Beast Armor active)
  const mph = (p.speed / spec.topSpeed) * spec.displayTopMph;
  if (!isBeast && copNearPlayer && mph < 55 && p.airZ <= 0) {
    p.bustMeter = Math.min(1, p.bustMeter + dt * 0.38);
  } else {
    p.bustMeter = Math.max(0, p.bustMeter - dt * 0.65);
  }

  // Hazards (Roadblocks & Spike Strips)
  for (let i = world.hazards.length - 1; i >= 0; i--) {
    const h = world.hazards[i];
    if (h.worldY < p.worldY - 450) {
      world.hazards.splice(i, 1);
      continue;
    }
    if (h.triggered || p.airZ > 14) continue;

    const dx = Math.abs(p.laneX - h.laneX);
    const dy = Math.abs(p.worldY - h.worldY);
    if (dx < (playerW + h.width) * 0.44 && dy < (playerL + h.length) * 0.44) {
      h.triggered = true;
      if (isBeast) {
        world.shakeIntensity = Math.max(world.shakeIntensity, 8);
        sound.playCrash(true);
        spawnBurst(world, h.laneX, h.worldY, '#FACC15', 16, 'debris', 1.25);
        addPopup(world, p.laneX, p.worldY + 40, 'BEAST SMASH!', '#FACC15');
      } else {
        const dmg = h.kind === 'spikes' ? 22 : 26;
        p.health = Math.max(0, p.health - dmg);
        p.lastDamageBy = h.kind === 'spikes' ? 'Police Spike Strip' : 'Police Roadblock';
        p.hitFlash = 0.25;
        p.speed = Math.max(220, p.speed * 0.58);
        world.score.combo = 1;
        world.score.comboTimer = 0;
        world.hitstopTimer = 0.045;
        world.shakeIntensity = 15;
        sound.playCrash(true);
        spawnBurst(world, h.laneX, h.worldY, '#FF5E7E', 18, 'debris', 1.2);
        addPopup(world, p.laneX, p.worldY + 40, h.kind === 'spikes' ? 'SPIKED!' : 'ROADBLOCK!', '#EF4444');
      }
    }
  }

  // Pickups
  for (let i = world.pickups.length - 1; i >= 0; i--) {
    const pk = world.pickups[i];
    pk.bobPhase += dt * 4.5;
    if (pk.collected || pk.worldY < p.worldY - 300) {
      world.pickups.splice(i, 1);
      continue;
    }
    const dx = Math.abs(p.laneX - pk.laneX);
    const dy = Math.abs(p.worldY - pk.worldY);
    if (dx < 34 && dy < 44) {
      pk.collected = true;
      sound.playPickup(pk.kind);
      if (pk.kind === 'cash') {
        const cash = awardHaul(world, 500, false);
        addPopup(world, pk.laneX, pk.worldY + 25, `+$${cash}`, '#34D399');
        spawnBurst(world, pk.laneX, pk.worldY, '#34D399', 8, 'cash', 0.7);
      } else if (pk.kind === 'nitro') {
        p.nitro = Math.min(p.maxNitro, p.nitro + 42);
        p.pickupEffects.push({ kind: 'boost', timer: 0, duration: 0.85 });
        addPopup(world, pk.laneX, pk.worldY + 25, 'BOOST +42%', '#38BDF8');
        spawnBurst(world, pk.laneX, pk.worldY, '#38BDF8', 12, 'spark', 0.9);
        spawnBurst(world, pk.laneX, pk.worldY, '#2DD4BF', 8, 'flame', 0.65);
      } else if (pk.kind === 'armor') {
        p.armorMaxTimer = 20;
        p.armorTimer = 20;
        p.bustMeter = 0;
        p.pickupEffects.push({ kind: 'armor', timer: 0, duration: 1.0 });
        world.shakeIntensity = Math.max(world.shakeIntensity, 8);
        addPopup(world, pk.laneX, pk.worldY + 30, 'BEAST ARMOR · 20s!', '#FACC15');
        spawnBurst(world, pk.laneX, pk.worldY, '#FACC15', 16, 'spark', 1.1);
        spawnBurst(world, pk.laneX, pk.worldY, '#A855F7', 12, 'flame', 0.85);
        world.praise.text = 'BEAST MODE! 20s UNSTOPPABLE!';
        world.praise.style = 'wow';
        world.praise.timer = 2.4;
        world.praise.cooldown = 4.0;
      } else {
        const wasLow = p.health / Math.max(1, p.maxHealth) <= 0.45;
        p.health = Math.min(p.maxHealth, p.health + 32);
        p.pickupEffects.push({ kind: 'health', timer: 0, duration: 0.85 });
        addPopup(world, pk.laneX, pk.worldY + 25, 'HEALTH +32', '#A3E635');
        spawnBurst(world, pk.laneX, pk.worldY, '#A3E635', 12, 'spark', 0.9);
        spawnBurst(world, pk.laneX, pk.worldY, '#34D399', 8, 'spark', 0.65);
        if (wasLow) {
          triggerPraiseOnce(world, 'clutch_repair', 'Awesome Save! Back Strong!', 'awesome', true);
        }
      }
      world.pickups.splice(i, 1);
    }
  }

  // Particles
  for (let i = world.particles.length - 1; i >= 0; i--) {
    const pt = world.particles[i];
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.life -= dt;
    if (pt.life <= 0) {
      world.particles.splice(i, 1);
    }
  }

  // Popups
  for (let i = world.popups.length - 1; i >= 0; i--) {
    const pop = world.popups[i];
    pop.worldY += 70 * dt;
    pop.life -= dt;
    if (pop.life <= 0) {
      world.popups.splice(i, 1);
    }
  }

  // Trim old skid marks
  while (world.skids.length > 0 && world.skids[0].worldY2 < p.worldY - 600) {
    world.skids.shift();
  }

  // Audio continuous update
  sound.updateDrivingLoops({
    speedNorm: Math.min(1, p.speed / spec.topSpeed),
    drifting: p.drifting,
    boosting: p.boosting,
    airborne: p.airZ > 0,
    wantedLevel: world.score.wantedLevel,
    time: world.time,
  });

  // Check End Conditions (Trigger Blast -> Fade -> Game Over)
  if (p.health <= 0) {
    triggerEndSequence(world, 'WRECKED', sound);
    return;
  }
  if (p.bustMeter >= 1) {
    triggerEndSequence(world, 'BUSTED', sound);
  }
}

function getCriminalTitle(world: EngineWorld): string {
  const haul = Math.round(world.score.haul);
  if (haul >= 45000 && world.score.peakStars >= 5) return 'Leonida Kingpin';
  if (world.score.peakStars >= 5 && haul >= 20000) return 'Leonida Most Wanted';
  if (world.score.copsWrecked >= 5) return 'Interceptor Crusher';
  if (world.score.maxCombo >= 8) return 'Phantom Drifter';
  if (world.score.nearMisses >= 15) return 'Thread-the-Needle Ace';
  if (haul >= 10000) return 'Coastal Strip Outlaw';
  return 'Sunset Joyrider';
}

function buildRunSummary(world: EngineWorld, reason: EndReason): RunSummary {
  const finalHaul = Math.round(world.score.haul);
  const isNewBest = saveBestScore(world.mode, finalHaul);
  const killedBy =
    reason === 'BUSTED'
      ? `Busted by ${world.player.lastBusterBy}`
      : `Wrecked by ${world.player.lastDamageBy}`;

  return {
    haul: finalHaul,
    distanceMeters: Math.round(world.player.worldY / PX_PER_METER),
    copsWrecked: world.score.copsWrecked,
    nearMisses: world.score.nearMisses,
    maxCombo: world.score.maxCombo,
    peakStars: world.score.peakStars,
    durationSec: Math.round(world.time),
    carId: world.carId,
    seed: world.seed,
    mode: world.mode,
    isVictory: false,
    reason,
    killedBy,
    titleEarned: getCriminalTitle(world),
    beatTarget: world.targetScore !== null ? finalHaul > world.targetScore : null,
    targetScore: world.targetScore,
    isNewBest,
  };
}

function triggerEndSequence(
  world: EngineWorld,
  reason: EndReason,
  sound: SoundEngine
): void {
  const p = world.player;
  p.boosting = false;
  p.drifting = false;
  p.speed *= 0.48;
  world.missiles = [];

  const isBlast = reason === 'WRECKED';
  world.blast = {
    active: true,
    timer: 0,
    duration: isBlast ? 1.3 : 1.05,
    reason,
    ringRadius: 8,
    flashAlpha: isBlast ? 1 : 0.35,
    fadeAlpha: 0,
    pendingSummary: buildRunSummary(world, reason),
  };

  if (isBlast) {
    sound.playBlast();
    world.shakeIntensity = 26;
    spawnBurst(world, p.laneX, p.worldY, '#FFFFFF', 18, 'spark', 1.6);
    spawnBurst(world, p.laneX, p.worldY, '#FDE68A', 24, 'flame', 1.5);
    spawnBurst(world, p.laneX, p.worldY, '#FF5A36', 26, 'debris', 1.45);
    spawnBurst(world, p.laneX, p.worldY, '#334155', 18, 'smoke', 1.1);
  } else {
    sound.playEnd(false);
    world.shakeIntensity = 12;
    spawnBurst(world, p.laneX, p.worldY, '#38BDF8', 16, 'spark', 1.0);
    spawnBurst(world, p.laneX, p.worldY, '#EF4444', 16, 'spark', 1.0);
  }
}

function stepBlastSequence(
  world: EngineWorld,
  dt: number,
  onEnd: (summary: RunSummary) => void
): void {
  const b = world.blast;
  const p = world.player;

  b.timer += dt;
  world.shakeIntensity = Math.max(0, world.shakeIntensity - dt * 20);

  // Slow car to a spinout halt
  p.speed *= Math.max(0, 1 - dt * 3.4);
  p.worldY += p.speed * dt;
  p.heading += (b.reason === 'WRECKED' ? 2.2 : 0.45) * dt;
  if (p.airZ > 0) {
    p.airZ = Math.max(0, p.airZ - dt * 160);
  }

  const roadCxNow = getRoadCenterX(p.worldY, world.curve);
  const targetCamX = roadCxNow + p.laneX * 0.28;
  world.cameraWorldX += (targetCamX - world.cameraWorldX) * Math.min(1, dt * 6);

  // Expand shockwave & fade flash, then darken smoothly into Game Over fade
  b.ringRadius = Math.min(240, (b.timer / 0.72) * 210);
  b.flashAlpha = Math.max(0, 1 - b.timer * 3.1);
  const fadeStart = b.duration * 0.42;
  b.fadeAlpha = Math.max(0, Math.min(1, (b.timer - fadeStart) / (b.duration - fadeStart)));

  // Trailing smoke & embers during blast
  if (b.reason === 'WRECKED' && b.timer < 0.9 && Math.random() < 0.75) {
    spawnBurst(
      world,
      p.laneX + (Math.random() - 0.5) * 16,
      p.worldY + (Math.random() - 0.5) * 20,
      Math.random() < 0.45 ? '#FF5A36' : '#475569',
      2,
      Math.random() < 0.45 ? 'flame' : 'smoke',
      0.55
    );
  }

  // Slow-motion ambient world drift
  const slowDt = dt * 0.45;
  for (let i = world.traffic.length - 1; i >= 0; i--) {
    const t = world.traffic[i];
    if (t.wrecked) {
      t.laneX += t.vx * slowDt;
      t.worldY += t.vy * slowDt;
      t.spin += t.spinVel * slowDt;
      t.alpha -= slowDt;
      if (t.alpha <= 0) world.traffic.splice(i, 1);
    } else {
      t.worldY += t.speed * slowDt;
    }
  }
  for (let i = world.cops.length - 1; i >= 0; i--) {
    const c = world.cops[i];
    c.worldY += c.speed * slowDt;
  }
  for (let i = world.particles.length - 1; i >= 0; i--) {
    const pt = world.particles[i];
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.life -= dt;
    if (pt.life <= 0) world.particles.splice(i, 1);
  }
  for (let i = world.popups.length - 1; i >= 0; i--) {
    const pop = world.popups[i];
    pop.worldY += 50 * dt;
    pop.life -= dt;
    if (pop.life <= 0) world.popups.splice(i, 1);
  }

  if (b.timer >= b.duration && b.pendingSummary) {
    world.finished = true;
    b.active = false;
    onEnd(b.pendingSummary);
  }
}

export function getHudSnapshot(world: EngineWorld, muted: boolean): HudSnapshot {
  const spec = CARS[world.carId];
  const distanceMeters = Math.round(world.player.worldY / PX_PER_METER);
  const districtIndex = Math.floor(Math.max(0, distanceMeters) / 1500) % DISTRICTS.length;

  const lvl = world.score.wantedLevel;
  let wantedProgress = 1;
  if (lvl < 5) {
    const prev = WANTED_THRESHOLDS[lvl];
    const next = WANTED_THRESHOLDS[lvl + 1];
    wantedProgress = Math.max(0, Math.min(1, (world.score.wantedPoints - prev) / (next - prev)));
  }

  return {
    haul: Math.round(world.score.haul),
    distanceMeters,
    speedMph: Math.round((world.player.speed / spec.topSpeed) * spec.displayTopMph),
    wantedLevel: world.score.wantedLevel,
    wantedProgress,
    health: Math.round(world.player.health),
    maxHealth: world.player.maxHealth,
    armorTimer: world.player.armorTimer,
    armorMaxTimer: world.player.armorMaxTimer,
    nitro: Math.round((world.player.nitro / world.player.maxNitro) * 100),
    combo: world.score.combo,
    comboTimer: Math.max(0, Math.min(1, world.score.comboTimer / 4.2)),
    districtIndex,
    districtName: DISTRICTS[districtIndex].name,
    copsWrecked: world.score.copsWrecked,
    nearMisses: world.score.nearMisses,
    maxCombo: world.score.maxCombo,
    airborne: world.player.airZ > 5,
    drifting: world.player.drifting,
    driftBonusReady: world.player.driftCharge >= 0.45,
    heatCooling: world.rules.coolingDown && world.score.wantedLevel > 0,
    missileWarning: world.missiles.length > 0,
    elapsedSec: world.time,
    praiseMessage: world.praise.text,
    praiseStyle: world.praise.style,
    blasting: world.blast.active,
    seed: world.seed,
    targetScore: world.targetScore,
    muted,
  };
}
