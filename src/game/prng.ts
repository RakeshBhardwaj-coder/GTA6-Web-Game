import { CarId, ChallengeInfo } from './types';

export function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateRandomSeed(): number {
  return Math.floor(100000 + Math.random() * 899999);
}

export function parseChallengeFromUrl(): ChallengeInfo | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const seedParam = params.get('seed');
    if (!seedParam) return null;
    const seed = parseInt(seedParam, 10);
    if (!Number.isFinite(seed) || seed <= 0) return null;

    const targetParam = params.get('target');
    const targetScore = targetParam ? parseInt(targetParam, 10) : undefined;
    const carParam = params.get('car') as CarId | null;
    const validCars: CarId[] = ['cheetah', 'banshee', 'comet'];
    const challengerCar = carParam && validCars.includes(carParam) ? carParam : undefined;
    const challengerName = params.get('rival') || undefined;

    return {
      seed,
      targetScore:
        targetScore && Number.isFinite(targetScore) && targetScore > 0 ? targetScore : undefined,
      challengerCar,
      challengerName,
    };
  } catch {
    return null;
  }
}

export function buildChallengeUrl(opts: {
  seed: number;
  targetScore: number;
  carId: CarId;
  rivalName?: string;
}): string {
  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set('seed', String(opts.seed));
  url.searchParams.set('target', String(Math.round(opts.targetScore)));
  url.searchParams.set('car', opts.carId);
  if (opts.rivalName) {
    url.searchParams.set('rival', opts.rivalName);
  }
  return url.toString();
}
