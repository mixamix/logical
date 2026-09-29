// ============================================================================
// Чистые функции логических элементов и комбинационных микросхем.
// Каждая принимает значения входов (Record<pin, Bit>) и возвращает
// карту значений выходных пинов (Record<pin, Bit>).
//
// Разделены на три группы:
//  - комбинационные (без состояния) — вычисляются чисто;
//  - последовательностные (с состоянием) — реализованы в simulator.ts,
//    здесь только их «чистое ядро» (next-state функция);
//  - микропроцессорные блоки (ALU, ROM) — тоже чистое ядро.
// ============================================================================

import type { Bit, ComponentType } from '@logic/shared';

/** Приводит произвольное число к Bit (0 или 1). */
export function toBit(value: number | undefined): Bit {
  return value ? 1 : 0;
}

/** Карта значений на пинах: имя пина -> Bit. */
export type PinBits = Record<string, Bit>;

// ----------------------------------------------------------------------------
// Вентили (базовые и расширенные)
// ----------------------------------------------------------------------------

/** NOT: инверсия входа a. */
export function evaluateNot(a: Bit): Bit {
  return a ? 0 : 1;
}

/** BUFFER: повторитель входа a. */
export function evaluateBuffer(a: Bit): Bit {
  return a ? 1 : 0;
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

/** XNOR: исключающее ИЛИ-НЕ. */
export function evaluateXnor(a: Bit, b: Bit): Bit {
  return a === b ? 1 : 0;
}

/** NAND: И-НЕ. */
export function evaluateNand(a: Bit, b: Bit): Bit {
  return a && b ? 0 : 1;
}

/** NOR: ИЛИ-НЕ. */
export function evaluateNor(a: Bit, b: Bit): Bit {
  return a || b ? 0 : 1;
}

/** AND3: трёхвходовое И. */
export function evaluateAnd3(a: Bit, b: Bit, c: Bit): Bit {
  return a && b && c ? 1 : 0;
}

/** OR3: трёхвходовое ИЛИ. */
export function evaluateOr3(a: Bit, b: Bit, c: Bit): Bit {
  return a || b || c ? 1 : 0;
}

/** NAND3: трёхвходовое И-НЕ. */
export function evaluateNand3(a: Bit, b: Bit, c: Bit): Bit {
  return a && b && c ? 0 : 1;
}

/** NOR3: трёхвходовое ИЛИ-НЕ. */
export function evaluateNor3(a: Bit, b: Bit, c: Bit): Bit {
  return a || b || c ? 0 : 1;
}

// ----------------------------------------------------------------------------
// Комбинационные микросхемы
// ----------------------------------------------------------------------------

/** HALF_ADDER: полусумматор. Возвращает { s (сумма), c (перенос) }. */
export function evaluateHalfAdder(a: Bit, b: Bit): PinBits {
  return {
    s: evaluateXor(a, b),
    c: evaluateAnd(a, b),
  };
}

/** FULL_ADDER: полный сумматор. Возвращает { s, cout }. */
export function evaluateFullAdder(a: Bit, b: Bit, cin: Bit): PinBits {
  const s1 = evaluateXor(a, b); // сумма первой ступени
  const c1 = evaluateAnd(a, b); // перенос первой ступени
  const s = evaluateXor(s1, cin); // итоговая сумма
  const c2 = evaluateAnd(s1, cin); // перенос второй ступени
  return {
    s,
    cout: evaluateOr(c1, c2),
  };
}

/** MUX2: мультиплексор 2→1. sel=0 -> d0, sel=1 -> d1. */
export function evaluateMux2(d0: Bit, d1: Bit, sel: Bit): Bit {
  return sel ? d1 : d0;
}

/** MUX4: мультиплексор 4→1. Адрес задаётся sel0 (младший), sel1 (старший). */
export function evaluateMux4(d0: Bit, d1: Bit, d2: Bit, d3: Bit, sel0: Bit, sel1: Bit): Bit {
  const idx = (sel1 << 1) | sel0;
  switch (idx) {
    case 0:
      return d0;
    case 1:
      return d1;
    case 2:
      return d2;
    default:
      return d3;
  }
}

/** DEMUX2: демультиплексор 1→2. Возвращает { y0, y1 }. */
export function evaluateDemux2(input: Bit, sel: Bit): PinBits {
  return sel ? { y0: 0, y1: input } : { y0: input, y1: 0 };
}

/** DECODER2: дешифратор 2→4. Возвращает { y0..y3 }. */
export function evaluateDecoder2(a: Bit, b: Bit): PinBits {
  const idx = (b << 1) | a;
  return {
    y0: idx === 0 ? 1 : 0,
    y1: idx === 1 ? 1 : 0,
    y2: idx === 2 ? 1 : 0,
    y3: idx === 3 ? 1 : 0,
  };
}

/** ENCODER4: шифратор 4→2. Возвращает { a, b }. Приоритет — младший индекс. */
export function evaluateEncoder4(d0: Bit, d1: Bit, d2: Bit, d3: Bit): PinBits {
  if (d0) return { a: 0, b: 0 };
  if (d1) return { a: 1, b: 0 };
  if (d2) return { a: 0, b: 1 };
  if (d3) return { a: 1, b: 1 };
  return { a: 0, b: 0 };
}

/**
 * COMPARATOR: компаратор двух 2-битных чисел.
 * A = a1*2 + a0, B = b1*2 + b0.
 * Возвращает { eq, gt, lt }.
 */
export function evaluateComparator(
  a0: Bit,
  a1: Bit,
  b0: Bit,
  b1: Bit,
): PinBits {
  const a = (a1 << 1) | a0;
  const b = (b1 << 1) | b0;
  return {
    eq: a === b ? 1 : 0,
    gt: a > b ? 1 : 0,
    lt: a < b ? 1 : 0,
  };
}

// ----------------------------------------------------------------------------
// Последовательностные элементы (next-state, без CLK-фронта)
// ----------------------------------------------------------------------------

/**
 * RS_LATCH: асинхронная RS-защёлка на элементах ИЛИ-НЕ.
 * Входы s, r; prevQ — предыдущее состояние q.
 * Возвращает { q, nq }. Состояние S=R=1 запрещено (даёт q=nq=0).
 */
export function evaluateRsLatch(s: Bit, r: Bit, prevQ: Bit): PinBits {
  if (s && r) {
    // Запрещённая комбинация: обе выходные линии в 0.
    return { q: 0, nq: 0 };
  }
  if (s) return { q: 1, nq: 0 };
  if (r) return { q: 0, nq: 1 };
  // Хранение предыдущего состояния.
  return { q: prevQ, nq: prevQ ? 0 : 1 };
}

/**
 * D_TRIGGER: D-триггер, срабатывает по фронту CLK (0→1).
 * Возвращает { q, nq }. prevQ — предыдущее состояние.
 * Фронт определяется в simulator.ts; здесь только целевое состояние.
 */
export function evaluateDTrigger(d: Bit, _prevQ: Bit): PinBits {
  return { q: d, nq: d ? 0 : 1 };
}

/**
 * JK_TRIGGER: JK-триггер по фронту CLK.
 * J=1,K=0 -> 1; J=0,K=1 -> 0; J=K=1 -> инверсия; J=K=0 -> хранение.
 */
export function evaluateJkTrigger(j: Bit, k: Bit, prevQ: Bit): PinBits {
  if (j && k) {
    const q = prevQ ? 0 : 1;
    return { q, nq: q ? 0 : 1 };
  }
  if (j) return { q: 1, nq: 0 };
  if (k) return { q: 0, nq: 1 };
  return { q: prevQ, nq: prevQ ? 0 : 1 };
}

/**
 * T_TRIGGER: T-триггер по фронту CLK.
 * T=1 -> инверсия; T=0 -> хранение.
 */
export function evaluateTTrigger(t: Bit, prevQ: Bit): PinBits {
  if (t) {
    const q = prevQ ? 0 : 1;
    return { q, nq: q ? 0 : 1 };
  }
  return { q: prevQ, nq: prevQ ? 0 : 1 };
}

/**
 * ALU4: 4-битное АЛУ.
 * op = op1*2 + op0:
 *   0 — A + B (арифметическое сложение, carry учитывается);
 *   1 — A - B (вычитание);
 *   2 — A AND B;
 *   3 — A XOR B.
 * Возвращает { r0..r3, zero, carry }.
 */
export function evaluateAlu4(inputs: PinBits): PinBits {
  const a = readNibble(inputs, 'a');
  const b = readNibble(inputs, 'b');
  const op = ((inputs.op1 ?? 0) << 1) | (inputs.op0 ?? 0);

  let result = 0;
  let carry = 0;

  switch (op) {
    case 0: {
      const sum = a + b;
      result = sum & 0xf;
      carry = sum > 0xf ? 1 : 0;
      break;
    }
    case 1: {
      const diff = a - b;
      result = ((diff % 16) + 16) % 16;
      carry = diff < 0 ? 1 : 0; // заём
      break;
    }
    case 2:
      result = a & b;
      break;
    default:
      result = a ^ b;
      break;
  }

  return {
    r0: toBit(result & 1),
    r1: toBit((result >> 1) & 1),
    r2: toBit((result >> 2) & 1),
    r3: toBit((result >> 3) & 1),
    zero: result === 0 ? 1 : 0,
    carry: toBit(carry),
  };
}

/** Читает 4-битное значение из входов с префиксом (a0..a3, b0..b3). */
function readNibble(inputs: PinBits, prefix: string): number {
  return (
    (inputs[`${prefix}0`] ?? 0) |
    ((inputs[`${prefix}1`] ?? 0) << 1) |
    ((inputs[`${prefix}2`] ?? 0) << 2) |
    ((inputs[`${prefix}3`] ?? 0) << 3)
  );
}

/**
 * ROM8x8: ПЗУ с прошитой таблицей (демонстрационной).
 * Адрес a0..a2 -> 8-битное слово. Содержимое фиксировано (учебное).
 */
export function evaluateRom8x8(inputs: PinBits): PinBits {
  const addr = ((inputs.a2 ?? 0) << 2) | ((inputs.a1 ?? 0) << 1) | (inputs.a0 ?? 0);
  // Демо-прошивка: квадраты чисел 0..7 (младшие 8 бит).
  const table = [0x00, 0x01, 0x04, 0x09, 0x10, 0x19, 0x24, 0x31];
  return byteToPins(table[addr] ?? 0);
}

/** Преобразует байт в карту пинов d0..d7. */
function byteToPins(value: number): PinBits {
  const out: PinBits = {};
  for (let i = 0; i < 8; i++) {
    out[`d${i}`] = toBit((value >> i) & 1);
  }
  return out;
}

// ----------------------------------------------------------------------------
// Универсальный вычислитель (комбинационная часть)
// ----------------------------------------------------------------------------

/**
 * Вычисляет комбинационный выход по типу компонента.
 * Для последовательностных элементов (RS_LATCH, D_TRIGGER, JK_TRIGGER,
 * T_TRIGGER, REGISTER4, COUNTER4, SHIFT_REG4, RAM8x8, CPU4) возвращает
 * пустую карту — их обрабатывает simulator.ts с учётом состояния и CLK.
 *
 * @param type тип компонента;
 * @param inputs значения на входах (имя пина -> Bit);
 * @param state  текущее внутреннее состояние (для элементов с памятью).
 */
export function evaluateGate(
  type: ComponentType,
  inputs: PinBits,
  state: number = 0,
): PinBits {
  const a = inputs.a ?? 0;
  const b = inputs.b ?? 0;
  const c = inputs.c ?? 0;

  switch (type) {
    // --- Базовые ---
    case 'SWITCH':
      return { out: toBit(state) };
    case 'LED':
      return {}; // у LED нет выхода
    case 'NOT':
      return { out: evaluateNot(a) };
    case 'AND':
      return { out: evaluateAnd(a, b) };
    case 'OR':
      return { out: evaluateOr(a, b) };
    case 'XOR':
      return { out: evaluateXor(a, b) };
    case 'NAND':
      return { out: evaluateNand(a, b) };
    case 'NOR':
      return { out: evaluateNor(a, b) };

    // --- Расширенные вентили ---
    case 'BUFFER':
      return { out: evaluateBuffer(a) };
    case 'XNOR':
      return { out: evaluateXnor(a, b) };
    case 'AND3':
      return { out: evaluateAnd3(a, b, c) };
    case 'OR3':
      return { out: evaluateOr3(a, b, c) };
    case 'NAND3':
      return { out: evaluateNand3(a, b, c) };
    case 'NOR3':
      return { out: evaluateNor3(a, b, c) };

    // --- Комбинационные микросхемы ---
    case 'HALF_ADDER':
      return evaluateHalfAdder(a, b);
    case 'FULL_ADDER':
      return evaluateFullAdder(a, b, inputs.cin ?? 0);
    case 'MUX2':
      return { out: evaluateMux2(inputs.d0 ?? 0, inputs.d1 ?? 0, inputs.sel ?? 0) };
    case 'MUX4':
      return {
        out: evaluateMux4(
          inputs.d0 ?? 0,
          inputs.d1 ?? 0,
          inputs.d2 ?? 0,
          inputs.d3 ?? 0,
          inputs.sel0 ?? 0,
          inputs.sel1 ?? 0,
        ),
      };
    case 'DEMUX2':
      return evaluateDemux2(inputs.in ?? 0, inputs.sel ?? 0);
    case 'DECODER2':
      return evaluateDecoder2(a, b);
    case 'ENCODER4':
      return evaluateEncoder4(
        inputs.d0 ?? 0,
        inputs.d1 ?? 0,
        inputs.d2 ?? 0,
        inputs.d3 ?? 0,
      );
    case 'COMPARATOR':
      return evaluateComparator(
        inputs.a0 ?? 0,
        inputs.a1 ?? 0,
        inputs.b0 ?? 0,
        inputs.b1 ?? 0,
      );

    // --- Микропроцессорные (комбинационная часть) ---
    case 'ALU4':
      return evaluateAlu4(inputs);
    case 'ROM8x8':
      return evaluateRom8x8(inputs);

    // --- Последовательностные (обрабатываются в simulator.ts) ---
    case 'RS_LATCH':
    case 'D_TRIGGER':
    case 'JK_TRIGGER':
    case 'T_TRIGGER':
    case 'REGISTER4':
    case 'COUNTER4':
    case 'SHIFT_REG4':
    case 'RAM8x8':
    case 'CPU4':
      return {};

    // --- Устройства отображения (только входы, без выходов) ---
    case 'SEG7':
    case 'LCD1602':
      return {};

    default: {
      // Исчерпывающая проверка: если добавится тип — TS подсветит.
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}
