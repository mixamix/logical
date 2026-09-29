// ============================================================================
// Базовый URL API. Единственное место, где решается,
// куда фронтенд шлёт запросы.
//
//  - dev:  VITE_API_BASE_URL не задан → пусто → работает прокси Vite (/api).
//  - prod: VITE_API_BASE_URL = https://<backend>.onrender.com → полный URL.
// ============================================================================

/**
 * Базовый префикс для всех запросов к API.
 * В dev — пустая строка (запрос идёт на тот же origin, Vite проксирует).
 * В prod — абсолютный URL бэкенда без завершающего слэша.
 */
export const API_BASE_URL: string = (
  import.meta.env.VITE_API_BASE_URL ?? ''
).replace(/\/$/, '');

/**
 * Собирает полный URL эндпоинта.
 * @param path путь, начинающийся со слэша (например, '/api/chat').
 */
export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}
