/// <reference types="vite/client" />

// Объявления типов для переменных окружения Vite.
// Без этого `import.meta.env` не типизирован (ошибка TS2339).
interface ImportMetaEnv {
  /** Базовый URL бэкенда. Пусто в dev (работает прокси Vite). */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
