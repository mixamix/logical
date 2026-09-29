// ============================================================================
// Точка входа Express-сервера.
//  - CORS только для разрешённого origin;
//  - JSON-парсер с лимитом;
//  - health-check;
//  - /api/chat с rate limiting;
//  - глобальный обработчик ошибок.
// ============================================================================

import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import { config } from './config.js';
import { chatRouter } from './routes/chat.js';
import { chatRateLimit } from './middleware/rateLimit.js';

const app = express();

// CORS: пускаем только фронтенд (Vercel в prod, localhost в dev).
app.use(
  cors({
    origin: config.corsOrigin,
    methods: ['GET', 'POST'],
  }),
);

// Тело запроса — JSON, не больше 100 КБ (чат-сообщения небольшие).
app.use(express.json({ limit: '100kb' }));

// Health-check для деплоя (Render/Railway пингуют этот путь).
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Основной эндпоинт чата с ограничением частоты.
app.use('/api/chat', chatRateLimit, chatRouter);

// Глобальный обработчик ошибок: последний рубеж.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[server] Необработанная ошибка:', err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

app.listen(config.port, () => {
  console.log(`[server] Backend запущен на http://localhost:${config.port}`);
  console.log(`[server] CORS origin: ${config.corsOrigin}`);
});
