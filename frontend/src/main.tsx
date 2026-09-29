// ============================================================================
// Точка входа фронтенда.
// ============================================================================

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.js';
import './index.css';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Не найден элемент #root');
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
