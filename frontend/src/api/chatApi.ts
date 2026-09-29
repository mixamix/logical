// ============================================================================
// Клиент backend-эндпоинта /api/chat.
// Единственное место во фронтенде, где мы ходим в сеть за ответом AI.
// ============================================================================

import type { ChatMessage, ChatResponse } from '@logic/shared';
import { apiUrl } from './baseUrl.js';

/**
 * Ошибка обращения к API чата.
 * Содержит HTTP-статус (если ответ пришёл) и текст сообщения.
 */
export class ChatApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'ChatApiError';
  }
}

/**
 * Отправляет историю сообщений на backend и возвращает ответ AI.
 *
 * @param messages история чата (user/assistant);
 * @param signal   AbortSignal для отмены запроса.
 */
export async function sendChat(
  messages: ChatMessage[],
  signal?: AbortSignal,
): Promise<ChatResponse> {
  let response: Response;
  try {
    response = await fetch(apiUrl('/api/chat'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
      signal,
    });
  } catch (err) {
    // Сеть недоступна / запрос отменён.
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ChatApiError('Запрос отменён');
    }
    throw new ChatApiError('Не удалось связаться с сервером. Проверьте подключение.');
  }

  if (!response.ok) {
    // Пытаемся вытащить человекочитаемое сообщение из тела ответа.
    let detail = `Ошибка сервера (${response.status})`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body?.error) detail = body.error;
    } catch {
      // тело не JSON — оставляем общее сообщение
    }
    if (response.status === 429) {
      detail = 'Слишком много запросов. Подождите минуту и попробуйте снова.';
    }
    throw new ChatApiError(detail, response.status);
  }

  // Успешный ответ. Валидируем минимально — полагаемся на контракт backend.
  const data = (await response.json()) as ChatResponse;
  if (typeof data?.reply !== 'string') {
    throw new ChatApiError('Некорректный ответ сервера.');
  }
  return data;
}
