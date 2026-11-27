import { CarId, CarSpec } from './types';

export const CARS: Record<CarId, CarSpec> = {
  cheetah: {
    id: 'cheetah',
    name: 'Coral',
    bodyColor: '#FF5A36',
    accentColor: '#FFB347',
    stripeColor: '#FFF7ED',
    topSpeed: 980,
    displayTopMph: 186,
    accel: 680,
    handling: 1.05,
    maxHealth: 100,
    nitroCapacity: 100,
    driftGrip: 0.92,
  },
  banshee: {
    id: 'banshee',
    name: 'Teal',
    bodyColor: '#0D9488',
    accentColor: '#5EEAD4',
    stripeColor: '#F8FAFC',
    topSpeed: 1080,
    displayTopMph: 208,
    accel: 740,
    handling: 0.96,
    maxHealth: 90,
    nitroCapacity: 120,
    driftGrip: 0.85,
  },
  comet: {
    id: 'comet',
    name: 'Gold',
    bodyColor: '#F59E0B',
    accentColor: '#FDE68A',
    stripeColor: '#1E293B',
    topSpeed: 940,
    displayTopMph: 178,
    accel: 710,
    handling: 1.0,
    maxHealth: 130,
    nitroCapacity: 95,
    driftGrip: 0.95,
  },
};

export const CAR_LIST: CarSpec[] = [CARS.cheetah, CARS.banshee, CARS.comet];

export const DISTRICTS = [
  {
    name: 'Sunset Beach Strip',
    startMeters: 0,
    endMeters: 1500,
  },
  {
    name: 'Keys Causeway',
    startMeters: 1500,
    endMeters: 3000,
  },
  {
    name: 'Neon Bay Expressway',
    startMeters: 3000,
    endMeters: 4500,
  },
] as const;
