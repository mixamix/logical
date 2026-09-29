// ============================================================================
// Rate limiting для /api/chat.
// Защищает от перерасхода токенов OpenAI и простого абьюза.
// ============================================================================

import rateLimit from 'express-rate-limit';

export const chatRateLimit = rateLimit({
  windowMs: 60_000, // окно — 1 минута
  max: 20, // не более 20 запросов в минуту с одного IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Слишком много запросов. Подождите минуту и попробуйте снова.',
  },
});
