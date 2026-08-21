import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

window.addEventListener('error', (event) => {
  console.error('[SATHI Admin] Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[SATHI Admin] Unhandled rejection:', event.reason);
});

const rootEl = document.getElementById('root');
if (rootEl) {
  rootEl.textContent = 'MOUNTING SATHI ADMIN...';
}

console.log('[SATHI Admin] main.tsx executing, root exists:', !!rootEl);

createRoot(rootEl!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
console.log('[SATHI Admin] App rendered');
