import { render } from 'preact';
import './styles/global.css';
import { App } from './App';

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered:', registration.scope);

        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 6 * 60 * 60 * 1000); // 6 hours

        // Notify user when update is ready
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New version ready, show toast
                const event = new CustomEvent('cukt:sw-update-ready');
                window.dispatchEvent(event);
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error('SW registration failed:', error);
      });
  });
}

render(<App />, document.getElementById('app')!);
