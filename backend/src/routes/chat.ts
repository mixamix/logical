// ============================================================================
// POST /api/chat — единственный эндпоинт MVP.
// Принимает { messages }, вызывает LLM, возвращает { reply, circuit?, highlight? }.
// ============================================================================

import { Router, type Request, type Response } from 'express';
import { chatRequestSchema, type ChatRequest } from '@logic/shared';
import { askLlm } from '../llm/client.js';
import { LlmError } from '../llm/errors.js';
import { validateBody } from '../middleware/validate.js';

export const chatRouter = Router();

chatRouter.post(
  '/',
  validateBody(chatRequestSchema),
  async (_req: Request, res: Response): Promise<void> => {
    // Валидированные данные лежат в res.locals.body (см. validateBody).
    const { messages } = res.locals.body as ChatRequest;

    try {
      const answer = await askLlm(messages);
      res.json(answer);
    } catch (err) {
      if (err instanceof LlmError) {
        res.status(err.status).json({ error: err.message });
        return;
      }

      console.error('[chat] Непредвиденная ошибка:', err);
      res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  },
);
