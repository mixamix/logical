import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Конфиг Vite: React + dev-прокси на бэкенд
// Прокси избавляет от CORS в dev-режиме и упрощает клиентский код.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
