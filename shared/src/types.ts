// ============================================================================
// Контракт схемы логических цепей (единый для AI, backend и frontend).
// Версия контракта фиксирована строкой, чтобы можно было развивать формат.
// ============================================================================

/** Версия контракта схемы. */
export const CIRCUIT_VERSION = '1.0' as const;
export type CircuitVersion = typeof CIRCUIT_VERSION;

/**
 * Типы компонентов и их пины:
 *
 * | Тип    | Входы | Выходы |
 * |--------|-------|--------|
 * | SWITCH | —     | out    |
 * | LED    | in    | —      |
 * | NOT    | a     | out    |
 * | AND    | a, b  | out    |
 * | OR     | a, b  | out    |
 * | XOR    | a, b  | out    |
 * | NAND   | a, b  | out    |
 * | NOR    | a, b  | out    |
 */
export type ComponentType =
  | 'SWITCH'
  | 'LED'
  | 'NOT'
  | 'AND'
  | 'OR'
  | 'XOR'
  | 'NAND'
  | 'NOR';

/** Логическое значение сигнала: 0 или 1. */
export type Bit = 0 | 1;

/** Координата на canvas в пикселях (сетка 50px): [x, y]. */
export type Position = [number, number];

export interface Component {
  /** Уникальный идентификатор компонента (например, "sw_a", "xor1"). */
  id: string;
  /** Тип логического элемента. */
  type: ComponentType;
  /** Подпись для пользователя (необязательна, например "A", "S"). */
  label?: string;
  /** Начальное состояние только для SWITCH: 0 или 1. */
  state?: Bit;
  /** Позиция на canvas: [x, y]. */
  pos: Position;
}

/**
 * Соединение между пинами двух компонентов.
 * Формат пина: "<componentId>.<pinName>", например "sw_a.out", "xor1.a".
 */
export interface Wire {
  /** Пин-источник (выход какого-либо компонента). */
  from: string;
  /** Пин-приёмник (вход какого-либо компонента). */
  to: string;
}

/** Полное описание логической схемы. */
export interface Circuit {
  version: CircuitVersion;
  components: Component[];
  wires: Wire[];
}

/** Ответ AI: текстовое объяснение + (опционально) схема и подсветка. */
export interface ChatResponse {
  /** Текстовое объяснение на русском. */
  reply: string;
  /** Сгенерированная схема (если пользователь просил собрать схему). */
  circuit?: Circuit;
  /** Список id компонентов/проводов для подсветки на canvas. */
  highlight?: string[];
}

/** Сообщение в чате. */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Карта входов/выходов по типу компонента. */
export interface PinSpec {
  inputs: string[];
  outputs: string[];
}

/** Единственный источник правды о пинах каждого типа компонента. */
export const COMPONENT_PINS: Record<ComponentType, PinSpec> = {
  SWITCH: { inputs: [], outputs: ['out'] },
  LED: { inputs: ['in'], outputs: [] },
  NOT: { inputs: ['a'], outputs: ['out'] },
  AND: { inputs: ['a', 'b'], outputs: ['out'] },
  OR: { inputs: ['a', 'b'], outputs: ['out'] },
  XOR: { inputs: ['a', 'b'], outputs: ['out'] },
  NAND: { inputs: ['a', 'b'], outputs: ['out'] },
  NOR: { inputs: ['a', 'b'], outputs: ['out'] },
};

/**
 * Список всех поддерживаемых типов компонентов (для Zod enum и UI).
 * Тип — кортеж непустых литералов, чтобы z.enum сохранял литеральный union,
 * а не расширял его до string.
 */
export const COMPONENT_TYPES = Object.keys(COMPONENT_PINS) as [
  ComponentType,
  ...ComponentType[],
];

/** Разбирает пин вида "id.pin" на составляющие. */
export function parsePin(ref: string): { id: string; pin: string } | null {
  const idx = ref.indexOf('.');
  if (idx <= 0 || idx === ref.length - 1) return null;
  return { id: ref.slice(0, idx), pin: ref.slice(idx + 1) };
}
