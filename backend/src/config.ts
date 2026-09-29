// ============================================================================
// Конфигурация backend: читается из переменных окружения (dotenv).
// Единая точка правды — не разбрасываем process.env по коду.
//
// LLM-слой провайдер-агностичен: OpenAI-совместимый API.
// По умолчанию — DeepSeek (https://api.deepseek.com).
// Переключение на OpenAI: смените LLM_BASE_URL и LLM_MODEL в .env.
// ============================================================================

import 'dotenv/config';

/**
 * Ключ LLM. Поддерживаем оба имени для обратной совместимости:
 *  - LLM_API_KEY — нейтральное (рекомендуется);
 *  - OPENAI_API_KEY — старое имя (если LLM_API_KEY не задан).
 */
function resolveApiKey(): string {
  const key = process.env.LLM_API_KEY ?? process.env.OPENAI_API_KEY;
  if (!key || key.trim() === '') {
    throw new Error(
      'Не задан ключ LLM: установите LLM_API_KEY (или OPENAI_API_KEY) в .env',
    );
  }
  return key;
}

/** Провайдер-агностичный блок настроек LLM. */
const llm = {
  /** API-ключ (DeepSeek или OpenAI — зависит от baseUrl). */
  apiKey: resolveApiKey(),

  /**
   * Базовый URL OpenAI-совместимого API.
   * DeepSeek: https://api.deepseek.com
   * OpenAI:   https://api.openai.com/v1
   */
  baseUrl: process.env.LLM_BASE_URL ?? 'https://api.deepseek.com',

  /**
   * Модель.
   * DeepSeek: deepseek-chat (V3, поддерживает json_object)
   * OpenAI:   gpt-4o-mini
   * ВАЖНО: deepseek-reasoner НЕ поддерживает response_format: json_object.
   */
  model: process.env.LLM_MODEL ?? 'deepseek-chat',

  /** Таймаут запроса к LLM в миллисекундах. DeepSeek бывает медленнее — 60с. */
  timeoutMs: Number(process.env.LLM_TIMEOUT_MS ?? 60_000),

  /**
   * Температура генерации. Низкая (0.2) — для предсказуемого JSON
   * при генерации схем. Можно повысить через LLM_TEMPERATURE.
   */
  temperature: Number(process.env.LLM_TEMPERATURE ?? 0.2),
} as const;

export const config = {
  /** Порт HTTP-сервера. */
  port: Number(process.env.PORT ?? 3001),

  /** Настройки LLM. */
  llm,

  /**
   * Разрешённый origin для CORS.
   * В dev — фронтенд Vite (http://localhost:5173).
   * В prod — URL фронтенда на Vercel.
   */
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
} as const;
