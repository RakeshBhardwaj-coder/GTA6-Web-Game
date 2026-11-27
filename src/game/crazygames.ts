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

export interface CrazyGamesAdModule {
  requestAd(
    type: 'midgame' | 'rewarded',
    callbacks: {
      adStarted: () => void;
      adFinished: () => void;
      adError: (error: unknown, errorData?: unknown) => void;
    }
  ): void;
  hasAdblock?: () => Promise<boolean>;
}

export interface CrazyGamesSDKInstance {
  init: () => Promise<void>;
  environment?: 'crazygames' | 'local' | 'disabled';
  data: CrazyGamesDataModule;
  game: CrazyGamesGameModule;
  ad: CrazyGamesAdModule;
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

export function isCrazyGames(): boolean {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return hostname === 'crazygames.com' || hostname.endsWith('.crazygames.com');
}

function isLocalSdkMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get('useLocalSdk') === 'true';
  } catch {
    return window.location.search.includes('useLocalSdk=true');
  }
}

export function isCrazyGamesReady(): boolean {
  return sdkReady;
}

async function waitForSdkObject(timeoutMs = 4000): Promise<CrazyGamesSDKInstance | undefined> {
  if (typeof window === 'undefined') return undefined;
  if (window.CrazyGames?.SDK) return window.CrazyGames.SDK;

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await new Promise((res) => setTimeout(res, 50));
    if (window.CrazyGames?.SDK) {
      return window.CrazyGames.SDK;
    }
  }
  return undefined;
}

export async function initCrazyGamesSdk(): Promise<boolean> {
  if (sdkReady) return true;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      if (!isCrazyGames() && !isLocalSdkMode()) {
        sdkReady = false;
        return false;
      }

      const sdk = await waitForSdkObject(3500);
      if (!sdk || typeof sdk.init !== 'function') {
        initPromise = null;
        return false;
      }

      if (sdk.environment === 'disabled') {
        console.warn('CrazyGames SDK is disabled on this domain; falling back to standalone mode.');
        sdkReady = false;
        return false;
      }

      // Attach direct .catch handler to avoid any unhandled promise rejections on unwhitelisted domains
      let initSucceeded = false;
      const initCall = sdk
        .init()
        .then(() => {
          initSucceeded = true;
          return true;
        })
        .catch((err: unknown) => {
          console.warn('CrazyGames sdk.init() handled notice:', err);
          return false;
        });

      const timeout = new Promise<boolean>((resolve) =>
        setTimeout(() => resolve(false), 4500)
      );

      await Promise.race([initCall, timeout]);

      if (!initSucceeded) {
        sdkReady = false;
        return false;
      }

      sdkReady = true;
      try {
        sdk.game?.loadingStart?.();
        sdk.game?.loadingStop?.();
      } catch {
        // ignore optional lifecycle call errors
      }
      return true;
    } catch (err) {
      console.warn('CrazyGames SDK init caught error:', err);
      sdkReady = false;
      initPromise = null;
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

  const sdk = typeof window !== 'undefined' ? window.CrazyGames?.SDK : undefined;
  if (sdkReady && sdk && sdk.environment !== 'disabled') {
    try {
      const sdkData = sdk.data;
      if (sdkData) {
        const cloudVal = sdkData.getItem(key);
        if (cloudVal !== null && cloudVal !== undefined && cloudVal !== '') {
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

  const sdk = typeof window !== 'undefined' ? window.CrazyGames?.SDK : undefined;
  if (sdkReady && sdk && sdk.environment !== 'disabled') {
    try {
      sdk.data?.setItem(key, value);
    } catch {
      // ignore CrazyGames data errors
    }
  }
}

export function notifyGameplayStart(): void {
  if (!sdkReady || gameplayActive) return;
  const sdk = typeof window !== 'undefined' ? window.CrazyGames?.SDK : undefined;
  if (!sdk || sdk.environment === 'disabled') return;
  try {
    sdk.game?.gameplayStart?.();
    gameplayActive = true;
  } catch {
    // ignore lifecycle errors
  }
}

export function notifyGameplayStop(): void {
  if (!sdkReady || !gameplayActive) return;
  const sdk = typeof window !== 'undefined' ? window.CrazyGames?.SDK : undefined;
  if (!sdk || sdk.environment === 'disabled') return;
  try {
    sdk.game?.gameplayStop?.();
    gameplayActive = false;
  } catch {
    // ignore lifecycle errors
  }
}

export function notifyHappytime(): void {
  if (!sdkReady) return;
  const sdk = typeof window !== 'undefined' ? window.CrazyGames?.SDK : undefined;
  if (!sdk || sdk.environment === 'disabled') return;
  try {
    sdk.game?.happytime?.();
  } catch {
    // ignore lifecycle errors
  }
}

export async function requestMidgameAd(
  onAdStarted: () => void,
  onAdFinished: () => void
): Promise<void> {
  if (!sdkReady) {
    try {
      await initCrazyGamesSdk();
    } catch {
      // ignore
    }
  }

  const sdk = typeof window !== 'undefined' ? window.CrazyGames?.SDK : undefined;
  if (
    !sdkReady ||
    !sdk ||
    sdk.environment === 'disabled' ||
    !sdk.ad ||
    typeof sdk.ad.requestAd !== 'function'
  ) {
    try {
      onAdStarted();
    } catch {}
    try {
      onAdFinished();
    } catch {}
    return;
  }

  let finishCalled = false;
  const safeFinish = () => {
    if (finishCalled) return;
    finishCalled = true;
    try {
      onAdFinished();
    } catch (e) {
      console.error('onAdFinished error:', e);
    }
  };

  const timer = setTimeout(() => {
    safeFinish();
  }, 16000);

  try {
    sdk.ad.requestAd('midgame', {
      adStarted: () => {
        try {
          onAdStarted();
        } catch {}
      },
      adFinished: () => {
        clearTimeout(timer);
        safeFinish();
      },
      adError: (error, errorData) => {
        clearTimeout(timer);
        console.warn('CrazyGames midgame ad error:', error, errorData);
        safeFinish();
      },
    });
  } catch (err) {
    clearTimeout(timer);
    console.warn('Exception during CrazyGames midgame requestAd call:', err);
    safeFinish();
  }
}

export async function requestRewardedAd(
  onReward: () => void,
  onAdFinished: () => void,
  onAdStarted?: () => void
): Promise<void> {
  if (!sdkReady) {
    try {
      await initCrazyGamesSdk();
    } catch {
      // ignore
    }
  }

  const sdk = typeof window !== 'undefined' ? window.CrazyGames?.SDK : undefined;
  if (
    !sdkReady ||
    !sdk ||
    sdk.environment === 'disabled' ||
    !sdk.ad ||
    typeof sdk.ad.requestAd !== 'function'
  ) {
    // SDK unavailable, adblock active, or disabled on external domain: safely grant reward directly
    try {
      onAdStarted?.();
    } catch {}
    try {
      onReward();
    } catch (e) {
      console.error('Reward callback error:', e);
    }
    try {
      onAdFinished();
    } catch (e) {
      console.error('Ad finished callback error:', e);
    }
    return;
  }

  let rewardGiven = false;
  let finishCalled = false;

  const safeReward = () => {
    if (rewardGiven) return;
    rewardGiven = true;
    try {
      onReward();
    } catch (e) {
      console.error('onReward error:', e);
    }
  };

  const safeFinish = () => {
    if (finishCalled) return;
    finishCalled = true;
    try {
      onAdFinished();
    } catch (e) {
      console.error('onAdFinished error:', e);
    }
  };

  const timer = setTimeout(() => {
    console.warn('CrazyGames rewarded ad timed out; proceeding with reward fallback');
    safeReward();
    safeFinish();
  }, 22000);

  try {
    sdk.ad.requestAd('rewarded', {
      adStarted: () => {
        try {
          onAdStarted?.();
        } catch {}
      },
      adFinished: () => {
        clearTimeout(timer);
        safeReward();
        safeFinish();
      },
      adError: (error, errorData) => {
        clearTimeout(timer);
        console.warn('CrazyGames rewarded ad error/unfilled:', error, errorData);
        // Fallback: grant reward anyway so user is never blocked
        safeReward();
        safeFinish();
      },
    });
  } catch (err) {
    clearTimeout(timer);
    console.warn('Exception during CrazyGames rewarded ad request:', err);
    safeReward();
    safeFinish();
  }
}
