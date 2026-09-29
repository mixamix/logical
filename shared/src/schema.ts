// ============================================================================
// Zod-схемы валидации контракта.
// Используются на backend (валидация ответа LLM) и на frontend (защита от битых данных).
// ============================================================================

import { z } from 'zod';
import {
  CIRCUIT_VERSION,
  COMPONENT_TYPES,
  COMPONENT_PINS,
  parsePin,
  type ComponentType,
} from './types.js';

/** Логическое значение: строго 0 или 1. */
export const bitSchema = z.union([z.literal(0), z.literal(1)]);

/** Тип компонента: enum из поддерживаемых типов (литеральный union). */
export const componentTypeSchema = z.enum(COMPONENT_TYPES);

/** Позиция: кортеж ровно из двух чисел. */
export const positionSchema = z.tuple([z.number(), z.number()]);

/** Компонент схемы. */
export const componentSchema = z
  .object({
    id: z.string().min(1, 'id не может быть пустым'),
    type: componentTypeSchema,
    label: z.string().optional(),
    state: bitSchema.optional(),
    pos: positionSchema,
  })
  .strict();

/** Пин вида "<id>.<pin>". */
export const pinRefSchema = z
  .string()
  .refine((v) => parsePin(v) !== null, {
    message: 'Пин должен быть в формате "<componentId>.<pinName>"',
  });

/** Провод между двумя пинами. */
export const wireSchema = z
  .object({
    from: pinRefSchema,
    to: pinRefSchema,
  })
  .strict();

/** Максимальное число компонентов (защита от гигантских схем). */
export const MAX_COMPONENTS = 100;
/** Максимальное число проводов. */
export const MAX_WIRES = 300;

/**
 * Полная схема.
 * Помимо структурной валидации Zod делает семантические проверки:
 *  - версия контракта совпадает;
 *  - id компонентов уникальны;
 *  - все пины в проводах ссылаются на существующие компоненты и валидные пины;
 *  - тип пина соответствует направлению (from — выход, to — вход).
 */
export const circuitSchema = z
  .object({
    version: z.literal(CIRCUIT_VERSION),
    components: z.array(componentSchema).min(1).max(MAX_COMPONENTS),
    wires: z.array(wireSchema).max(MAX_WIRES),
  })
  .strict()
  .superRefine((circuit, ctx) => {
    // 1. Уникальность id компонентов.
    const seen = new Set<string>();
    for (const c of circuit.components) {
      if (seen.has(c.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['components'],
          message: `Дублирующийся id компонента: "${c.id}"`,
        });
      }
      seen.add(c.id);
    }

    // Карта id -> тип для быстрой проверки пинов.
    const byId = new Map<string, ComponentType>(
      circuit.components.map((c) => [c.id, c.type] as [string, ComponentType]),
    );

    // 2. Проверка каждого провода.
    circuit.wires.forEach((w, i) => {
      const from = parsePin(w.from);
      const to = parsePin(w.to);

      if (!from) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['wires', i, 'from'],
          message: `Некорректный пин источника: "${w.from}"`,
        });
      } else {
        const fromType = byId.get(from.id);
        if (!fromType) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['wires', i, 'from'],
            message: `Провод ссылается на несуществующий компонент: "${from.id}"`,
          });
        } else if (!COMPONENT_PINS[fromType].outputs.includes(from.pin)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['wires', i, 'from'],
            message: `У компонента "${from.id}" (${fromType}) нет выхода "${from.pin}"`,
          });
        }
      }

      if (!to) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['wires', i, 'to'],
          message: `Некорректный пин приёмника: "${w.to}"`,
        });
      } else {
        const toType = byId.get(to.id);
        if (!toType) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['wires', i, 'to'],
            message: `Провод ссылается на несуществующий компонент: "${to.id}"`,
          });
        } else if (!COMPONENT_PINS[toType].inputs.includes(to.pin)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['wires', i, 'to'],
            message: `У компонента "${to.id}" (${toType}) нет входа "${to.pin}"`,
          });
        }
      }
    });
  });

/** Ответ AI: reply обязателен, circuit/highlight — опциональны. */
export const chatResponseSchema = z
  .object({
    reply: z.string().min(1),
    circuit: circuitSchema.optional(),
    highlight: z.array(z.string()).optional(),
  })
  .strict();

/** Сообщение в чате. */
export const chatMessageSchema = z
  .object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1),
  })
  .strict();

/** Тело запроса к /api/chat. */
export const chatRequestSchema = z
  .object({
    messages: z.array(chatMessageSchema).min(1).max(50),
  })
  .strict();

/** Типы, выведенные из Zod-схем (гарантированно совпадают с валидацией). */
export type CircuitInput = z.input<typeof circuitSchema>;
export type CircuitParsed = z.output<typeof circuitSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ChatResponseParsed = z.infer<typeof chatResponseSchema>;
