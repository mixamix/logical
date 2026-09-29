// ============================================================================
// Чистые функции логических вентилей.
// Каждая принимает значения входов и возвращает значение выхода (0 или 1).
// Отделены от графа — легко тестировать (Шаг 11).
// ============================================================================

import type { Bit, ComponentType } from '@logic/shared';

/** Приводит произвольное число к Bit (0 или 1). */
export function toBit(value: number | undefined): Bit {
  return value ? 1 : 0;
}

/** NOT: инверсия входа a. */
export function evaluateNot(a: Bit): Bit {
  return a ? 0 : 1;
}

/** AND: логическое И. */
export function evaluateAnd(a: Bit, b: Bit): Bit {
  return a && b ? 1 : 0;
}

/** OR: логическое ИЛИ. */
export function evaluateOr(a: Bit, b: Bit): Bit {
  return a || b ? 1 : 0;
}

/** XOR: исключающее ИЛИ. */
export function evaluateXor(a: Bit, b: Bit): Bit {
  return a !== b ? 1 : 0;
}

/** NAND: И-НЕ. */
export function evaluateNand(a: Bit, b: Bit): Bit {
  return a && b ? 0 : 1;
}

/** NOR: ИЛИ-НЕ. */
export function evaluateNor(a: Bit, b: Bit): Bit {
  return a || b ? 0 : 1;
}

/**
 * Универсальный вычислитель: по типу вентиля и значениям входов даёт выход.
 * Для SWITCH возвращает переданное состояние, для LED — 0 (у LED нет выхода).
 *
 * @param type тип компонента;
 * @param inputs значения на входах (a, b) — отсутствующие считаются 0;
 * @param switchState состояние SWITCH (только для type = 'SWITCH').
 */
export function evaluateGate(
  type: ComponentType,
  inputs: { a?: Bit; b?: Bit },
  switchState: Bit = 0,
): Bit {
  const a = inputs.a ?? 0;
  const b = inputs.b ?? 0;

  switch (type) {
    case 'SWITCH':
      return switchState;
    case 'LED':
      // У LED нет выхода — возвращаем 0 для единообразия.
      return 0;
    case 'NOT':
      return evaluateNot(a);
    case 'AND':
      return evaluateAnd(a, b);
    case 'OR':
      return evaluateOr(a, b);
    case 'XOR':
      return evaluateXor(a, b);
    case 'NAND':
      return evaluateNand(a, b);
    case 'NOR':
      return evaluateNor(a, b);
    default: {
      // Исчерпывающая проверка: если добавится тип — TS подсветит.
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}
