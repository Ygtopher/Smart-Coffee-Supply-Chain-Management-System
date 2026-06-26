import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './styles/index.css';
import './app/i18n';
import App from './app/App';

const renderApplication = () => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
};

const prepareApplication = async () => {
  if ('caches' in window) {
    await caches.delete('farmer-api-cache').catch(() => false);
  }

  if ('serviceWorker' in navigator && !import.meta.env.PROD) {
    const hadController = Boolean(navigator.serviceWorker.controller);
    const registrations = await navigator.serviceWorker.getRegistrations().catch(() => []);
    await Promise.all(registrations.map(registration => registration.unregister().catch(() => false)));

    if ('caches' in window) {
      const cacheNames = await caches.keys().catch(() => []);
      await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName).catch(() => false)));
    }

    const reloadKey = 'coffee_scm_dev_service_worker_cleared';
    if (hadController && !sessionStorage.getItem(reloadKey)) {
      sessionStorage.setItem(reloadKey, 'true');
      window.location.reload();
      return;
    }
    sessionStorage.removeItem(reloadKey);
  }

  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    let hasReloadedForUpdate = false;
    let updateServiceWorker: ((reloadPage?: boolean) => Promise<void>) | undefined;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hasReloadedForUpdate) return;
      hasReloadedForUpdate = true;
      window.location.reload();
    });

    updateServiceWorker = registerSW({
      immediate: true,
      onNeedRefresh() {
        void updateServiceWorker?.(true);
      },
      onRegisteredSW(_swUrl, registration) {
        if (!registration) return;
        window.setInterval(() => {
          if (navigator.onLine) {
            void registration.update();
          }
        }, 60 * 1000);
      },
    });
  }

  renderApplication();
};

void prepareApplication();
