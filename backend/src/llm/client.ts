// ============================================================================
// Обёртка над OpenAI SDK.
// Задачи:
//  - отправка system prompt + истории сообщений;
//  - JSON-режим (response_format: json_object);
//  - таймаут через AbortController;
//  - парсинг и Zod-валидация ответа модели;
//  - маппинг ошибок SDK в LlmError со статусом.
// ============================================================================

import OpenAI from 'openai';
import { chatResponseSchema, type ChatMessage, type ChatResponse } from '@logic/shared';
import { config } from '../config.js';
import { SYSTEM_PROMPT, RETRY_INSTRUCTION } from './prompt.js';
import { LlmError } from './errors.js';

/** Единственный экземпляр клиента OpenAI. */
const openai = new OpenAI({
  apiKey: config.llm.apiKey,
  // OpenAI-совместимый baseURL: DeepSeek по умолчанию, OpenAI — через .env.
  baseURL: config.llm.baseUrl,
  timeout: config.llm.timeoutMs,
});

/**
 * Извлекает JSON из ответа модели.
 * Модель обязана вернуть чистый JSON (json_object), но на случай markdown-обёртки
 * предусмотрен fallback: вырезаем содержимое ```json ... ```.
 */
function parseModelJson(raw: string): unknown {
  const trimmed = raw.trim();

  // Быстрый путь: чистый JSON.
  try {
    return JSON.parse(trimmed);
  } catch {
    // Медленный путь: ищем блок в markdown-обёртке.
    const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (match) {
      try {
        return JSON.parse(match[1].trim());
      } catch {
        /* падаем ниже */
      }
    }
  }

  throw new LlmError('LLM вернула невалидный JSON', 502);
}

/** Максимальное число попыток запроса к LLM (1 исходная + 1 retry). */
const MAX_ATTEMPTS = 2;

/** JSON-режим (response_format: json_object) поддерживают OpenAI и DeepSeek, */
/** но НЕ локальные модели в Ollama — там запрос падает с 400. */
const supportsJsonMode =
  config.llm.baseUrl.includes('api.openai.com') ||
  config.llm.baseUrl.includes('api.deepseek.com') ||
  config.llm.baseUrl.includes('api.groq.com');

/**
 * Один запрос к LLM с последующей валидацией.
 * Бросает LlmError с признаком «ответ невалиден», чтобы вызывающий код
 * мог решить, повторять ли запрос.
 */
async function requestOnce(messages: ChatMessage[]): Promise<ChatResponse> {
  const completion = await openai.chat.completions.create({
    model: config.llm.model,
    ...(supportsJsonMode ? { response_format: { type: 'json_object' as const } } : {}),
    temperature: config.llm.temperature,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new LlmError('LLM вернула пустой ответ', 502);
  }

  const json = parseModelJson(raw);
  const parsed = chatResponseSchema.safeParse(json);

  if (!parsed.success) {
    // Логируем детали для отладки, клиенту отдаём обобщённую ошибку.
    console.error('[llm] Ответ не прошёл валидацию:', parsed.error.issues);
    throw new LlmError('LLM вернула схему, не соответствующую контракту', 502);
  }

  return parsed.data as ChatResponse;
}

/**
 * Отправляет историю сообщений в LLM и возвращает валидированный ответ.
 *
 * Шаг 9: при невалидном ответе модели делается повторная попытка с явной
 * инструкцией «исправь ошибку». Это повышает шансы получить корректную
 * схему от слабых локальных моделей (например, phi4-mini).
 *
 * @param messages история чата (user/assistant).
 * @throws LlmError при таймауте, отказе модели или невалидном ответе.
 */
export async function askLlm(messages: ChatMessage[]): Promise<ChatResponse> {
  try {
    let lastError: LlmError | null = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        // На повторной попытке добавляем напоминание об ошибке.
        const attemptMessages =
          attempt === 1
            ? messages
            : [
                ...messages,
                {
                  role: 'user' as const,
                  content: RETRY_INSTRUCTION,
                },
              ];
        return await requestOnce(attemptMessages);
      } catch (err) {
        // Повторяем только при невалидном ответе модели (502 от валидатора),
        // а не при сетевых сбоях, таймаутах или ошибках авторизации.
        if (
          err instanceof LlmError &&
          err.status === 502 &&
          err.message.includes('контракту') &&
          attempt < MAX_ATTEMPTS
        ) {
          lastError = err;
          console.warn(`[llm] Попытка ${attempt} невалидна, повторяем…`);
          continue;
        }
        throw err;
      }
    }

    // Сюда попадаем, только если все попытки провалились.
    throw lastError ?? new LlmError('LLM вернула невалидный ответ', 502);
  } catch (err) {
    if (err instanceof LlmError) throw err;

    // Таймаут/сетевые ошибки OpenAI SDK.
    if (err instanceof OpenAI.APIError) {
      if (err.status === 401) {
        throw new LlmError('Неверный API-ключ LLM', 500);
      }
      if (err.status === 402) {
        throw new LlmError('Закончился баланс LLM-провайдера. Пополните счёт.', 402);
      }
      if (err.status === 429) {
        throw new LlmError('Превышен лимит запросов к LLM', 429);
      }
      throw new LlmError(`Ошибка LLM-провайдера: ${err.message}`, 502);
    }

    if (err instanceof Error && err.name === 'AbortError') {
      throw new LlmError('Превышено время ожидания ответа LLM', 504);
    }

    console.error('[llm] Непредвиденная ошибка:', err);
    throw new LlmError('Внутренняя ошибка LLM-слоя', 500);
  }
}
