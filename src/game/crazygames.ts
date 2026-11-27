export interface CrazyGamesDataModule {
  setItem(key: string, value: string): void;
  getItem(key: string): string | null;
  removeItem(key: string): void;
  clear(): void;
}

export interface CrazyGamesGameModule {
  loadingStart?: () => void;
  loadingStop?: () => void;
  gameplayStart: () => void;
  gameplayStop: () => void;
  happytime?: () => void;
}

export interface CrazyGamesSDKInstance {
  init: () => Promise<void>;
  environment?: 'crazygames' | 'local' | 'disabled';
  data: CrazyGamesDataModule;
  game: CrazyGamesGameModule;
}

declare global {
  interface Window {
    CrazyGames?: {
      SDK?: CrazyGamesSDKInstance;
    };
  }
}

let sdkReady = false;
let initPromise: Promise<boolean> | null = null;
let gameplayActive = false;

export function isCrazyGamesReady(): boolean {
  return sdkReady;
}

export async function initCrazyGamesSdk(): Promise<boolean> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const sdk = typeof window !== 'undefined' ? window.CrazyGames?.SDK : undefined;
    if (!sdk) {
      return false;
    }
    try {
      await sdk.init();
      sdkReady = true;
      try {
        sdk.game?.loadingStart?.();
        sdk.game?.loadingStop?.();
      } catch {
        // ignore optional lifecycle call errors
      }
      return true;
    } catch {
      sdkReady = false;
      return false;
    }
  })();

  return initPromise;
}

export function getGameItem(key: string): string | null {
  let localVal: string | null = null;
  try {
    localVal = localStorage.getItem(key);
  } catch {
    localVal = null;
  }

  if (sdkReady) {
    try {
      const sdkData = window.CrazyGames?.SDK?.data;
      if (sdkData) {
        const cloudVal = sdkData.getItem(key);
        if (cloudVal !== null && cloudVal !== undefined && cloudVal !== '') {
          // Keep local cache aligned with CrazyGames cloud/data store
          try {
            localStorage.setItem(key, cloudVal);
          } catch {
            // ignore storage errors
          }
          return cloudVal;
        }
        if (localVal !== null) {
          sdkData.setItem(key, localVal);
        }
      }
    } catch {
      // fall back to localStorage value
    }
  }

  return localVal;
}

export function setGameItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore storage errors
  }

  if (sdkReady) {
    try {
      window.CrazyGames?.SDK?.data?.setItem(key, value);
    } catch {
      // ignore CrazyGames data errors
    }
  }
}

export function notifyGameplayStart(): void {
  if (!sdkReady || gameplayActive) return;
  try {
    window.CrazyGames?.SDK?.game?.gameplayStart();
    gameplayActive = true;
  } catch {
    // ignore lifecycle errors
  }
}

export function notifyGameplayStop(): void {
  if (!sdkReady || !gameplayActive) return;
  try {
    window.CrazyGames?.SDK?.game?.gameplayStop();
    gameplayActive = false;
  } catch {
    // ignore lifecycle errors
  }
}

export function notifyHappytime(): void {
  if (!sdkReady) return;
  try {
    window.CrazyGames?.SDK?.game?.happytime?.();
  } catch {
    // ignore lifecycle errors
  }
}
