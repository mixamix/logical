// ============================================================================
// Контракт схемы логических цепей (единый для AI, backend и frontend).
// Версия контракта фиксирована строкой, чтобы можно было развивать формат.
// ============================================================================

/** Версия контракта схемы. */
export const CIRCUIT_VERSION = '1.0' as const;
export type CircuitVersion = typeof CIRCUIT_VERSION;

/**
 * Типы компонентов и их пины.
 *
 * Группа 1 — базовые элементы (Шаги 1-9):
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
 *
 * Группа 2 — расширенные вентили:
 * | BUFFER | a        | out |
 * | XNOR   | a, b     | out |
 * | AND3   | a, b, c  | out |
 * | OR3    | a, b, c  | out |
 * | NAND3  | a, b, c  | out |
 * | NOR3   | a, b, c  | out |
 *
 * Группа 3 — комбинационные микросхемы:
 * | HALF_ADDER | a, b        | s, c   |
 * | FULL_ADDER | a, b, cin   | s, cout|
 * | MUX2       | d0, d1, sel | out    |
 * | MUX4       | d0..d3, sel0, sel1 | out |
 * | DEMUX2     | in, sel     | y0, y1 |
 * | DECODER2   | a, b        | y0..y3 |
 * | ENCODER4   | d0..d3      | a, b   |
 * | COMPARATOR | a0, a1, b0, b1 | eq, gt, lt |
 *
 * Группа 4 — последовательностные элементы (с состоянием):
 * | RS_LATCH  | s, r        | q, nq  |
 * | D_TRIGGER | d, clk      | q, nq  |
 * | JK_TRIGGER| j, k, clk   | q, nq  |
 * | T_TRIGGER | t, clk      | q, nq  |
 * | REGISTER4 | d0..d3, clk, en | q0..q3 |
 * | COUNTER4  | clk, rst, en | q0..q3, carry |
 * | SHIFT_REG4| din, clk, en | q0..q3 |
 *
 * Группа 5 — микропроцессорные блоки:
 * | ALU4      | a0..a3, b0..b3, op0, op1 | r0..r3, zero, carry |
 * | ROM8x8    | a0..a2      | d0..d7 |
 * | RAM8x8    | a0..a2, d0..d7, we, clk | q0..q7 |
 * | CPU4      | clk, rst, ir0..ir3 | acc0..acc3, pc0..pc3, zf |
 *
 * Группа 6 — устройства отображения (только входы, без выходов):
 * | SEG7   | a, b, c, d, e, f, g, dp | — |
 * | LCD1602| rs, e, d0..d7         | — |
 */
export type ComponentType =
  // Базовые
  | 'SWITCH'
  | 'LED'
  | 'NOT'
  | 'AND'
  | 'OR'
  | 'XOR'
  | 'NAND'
  | 'NOR'
  // Расширенные вентили
  | 'BUFFER'
  | 'XNOR'
  | 'AND3'
  | 'OR3'
  | 'NAND3'
  | 'NOR3'
  // Комбинационные микросхемы
  | 'HALF_ADDER'
  | 'FULL_ADDER'
  | 'MUX2'
  | 'MUX4'
  | 'DEMUX2'
  | 'DECODER2'
  | 'ENCODER4'
  | 'COMPARATOR'
  // Последовательностные элементы
  | 'RS_LATCH'
  | 'D_TRIGGER'
  | 'JK_TRIGGER'
  | 'T_TRIGGER'
  | 'REGISTER4'
  | 'COUNTER4'
  | 'SHIFT_REG4'
  // Микропроцессорные блоки
  | 'ALU4'
  | 'ROM8x8'
  | 'RAM8x8'
  | 'CPU4'
  // Устройства отображения
  | 'SEG7'
  | 'LCD1602';

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
  /**
   * Начальное состояние для элементов с памятью:
   *  - одно число — триггеры/счётчики (значение регистра);
   *  - массив чисел — многоячейковые (REGISTER4, RAM8x8).
   * Для элементов без памяти не используется.
   */
  initialState?: number | number[];
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
  // --- Базовые ---
  SWITCH: { inputs: [], outputs: ['out'] },
  LED: { inputs: ['in'], outputs: [] },
  NOT: { inputs: ['a'], outputs: ['out'] },
  AND: { inputs: ['a', 'b'], outputs: ['out'] },
  OR: { inputs: ['a', 'b'], outputs: ['out'] },
  XOR: { inputs: ['a', 'b'], outputs: ['out'] },
  NAND: { inputs: ['a', 'b'], outputs: ['out'] },
  NOR: { inputs: ['a', 'b'], outputs: ['out'] },

  // --- Расширенные вентили ---
  BUFFER: { inputs: ['a'], outputs: ['out'] },
  XNOR: { inputs: ['a', 'b'], outputs: ['out'] },
  AND3: { inputs: ['a', 'b', 'c'], outputs: ['out'] },
  OR3: { inputs: ['a', 'b', 'c'], outputs: ['out'] },
  NAND3: { inputs: ['a', 'b', 'c'], outputs: ['out'] },
  NOR3: { inputs: ['a', 'b', 'c'], outputs: ['out'] },

  // --- Комбинационные микросхемы ---
  HALF_ADDER: { inputs: ['a', 'b'], outputs: ['s', 'c'] },
  FULL_ADDER: { inputs: ['a', 'b', 'cin'], outputs: ['s', 'cout'] },
  MUX2: { inputs: ['d0', 'd1', 'sel'], outputs: ['out'] },
  MUX4: { inputs: ['d0', 'd1', 'd2', 'd3', 'sel0', 'sel1'], outputs: ['out'] },
  DEMUX2: { inputs: ['in', 'sel'], outputs: ['y0', 'y1'] },
  DECODER2: { inputs: ['a', 'b'], outputs: ['y0', 'y1', 'y2', 'y3'] },
  ENCODER4: { inputs: ['d0', 'd1', 'd2', 'd3'], outputs: ['a', 'b'] },
  COMPARATOR: { inputs: ['a0', 'a1', 'b0', 'b1'], outputs: ['eq', 'gt', 'lt'] },

  // --- Последовательностные элементы ---
  RS_LATCH: { inputs: ['s', 'r'], outputs: ['q', 'nq'] },
  D_TRIGGER: { inputs: ['d', 'clk'], outputs: ['q', 'nq'] },
  JK_TRIGGER: { inputs: ['j', 'k', 'clk'], outputs: ['q', 'nq'] },
  T_TRIGGER: { inputs: ['t', 'clk'], outputs: ['q', 'nq'] },
  REGISTER4: { inputs: ['d0', 'd1', 'd2', 'd3', 'clk', 'en'], outputs: ['q0', 'q1', 'q2', 'q3'] },
  COUNTER4: { inputs: ['clk', 'rst', 'en'], outputs: ['q0', 'q1', 'q2', 'q3', 'carry'] },
  SHIFT_REG4: { inputs: ['din', 'clk', 'en'], outputs: ['q0', 'q1', 'q2', 'q3'] },

  // --- Микропроцессорные блоки ---
  ALU4: {
    inputs: ['a0', 'a1', 'a2', 'a3', 'b0', 'b1', 'b2', 'b3', 'op0', 'op1'],
    outputs: ['r0', 'r1', 'r2', 'r3', 'zero', 'carry'],
  },
  ROM8x8: { inputs: ['a0', 'a1', 'a2'], outputs: ['d0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7'] },
  RAM8x8: {
    inputs: ['a0', 'a1', 'a2', 'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'we', 'clk'],
    outputs: ['q0', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7'],
  },
  CPU4: {
    inputs: ['clk', 'rst', 'ir0', 'ir1', 'ir2', 'ir3'],
    outputs: ['acc0', 'acc1', 'acc2', 'acc3', 'pc0', 'pc1', 'pc2', 'pc3', 'zf'],
  },

  // --- Устройства отображения (только входы) ---
  // 7-сегментный индикатор: 7 сегментов (a..g) + десятичная точка (dp).
  SEG7: { inputs: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'dp'], outputs: [] },
  // ЖК-дисплей 1602 (2 строки × 16 символов): rs — выбор регистра, e — строб,
  // d0..d7 — 8-битная шина данных.
  LCD1602: { inputs: ['rs', 'e', 'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7'], outputs: [] },
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
