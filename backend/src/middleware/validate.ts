// ============================================================================
// Middleware валидации тела запроса через Zod.
// Принимает схему и возвращает Express-middleware, который:
//  - проверяет req.body;
//  - при успехе кладёт распарсенные данные в res.locals.body и вызывает next();
//  - при ошибке возвращает 400 с деталями.
// ============================================================================

import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        error: 'Некорректное тело запроса',
        issues: result.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      });
      return;
    }

    // Кладём валидированные данные, чтобы роутер не парсил повторно.
    res.locals.body = result.data;
    next();
  };
}
