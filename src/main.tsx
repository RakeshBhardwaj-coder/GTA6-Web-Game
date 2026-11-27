import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {ErrorBoundary} from './components/ErrorBoundary.tsx';
import './index.css';
if (typeof window !== 'undefined') {
  const isCrazySdkNotice = (err: unknown): boolean => {
    if (!err) return false;
    if (typeof err === 'string') {
      return (
        err.includes('CrazySDK') ||
        err.includes('crazygames') ||
        err.includes('sdkDisabled') ||
        err.includes('Script error') ||
        err.includes('adblock')
      );
    }
    if (typeof err === 'object') {
      try {
        const obj = err as Record<string, unknown>;
        const code = String(obj.code || '');
        const message = String(obj.message || '');
        const reason = String(obj.reason || '');
        if (
          code === 'sdkDisabled' ||
          code.includes('crazy') ||
          message.includes('CrazySDK') ||
          message.includes('crazygames') ||
          reason.includes('CrazySDK')
        ) {
          return true;
        }
        const json = JSON.stringify(err);
        return (
          json.includes('CrazySDK') ||
          json.includes('sdkDisabled') ||
          json.includes('crazygames')
        );
      } catch {
        return false;
      }
    }
    return false;
  };

  window.addEventListener('unhandledrejection', (event) => {
    if (isCrazySdkNotice(event.reason)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      console.warn('Handled CrazyGames domain notice:', event.reason);
    }
  });

  window.addEventListener('error', (event) => {
    if (isCrazySdkNotice(event.error) || isCrazySdkNotice(event.message)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      console.warn('Handled CrazyGames script error:', event.message);
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
