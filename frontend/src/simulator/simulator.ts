// ============================================================================
// Движок симуляции логической схемы (расширенный, Шаг 13.1a).
//
// Поддерживает:
//  - множество входов/выходов на компонент (Record<pin, Bit>);
//  - внутреннее состояние элементов памяти (триггеры, регистры, счётчики, ОЗУ);
//  - тактовый сигнал CLK с детекцией фронта 0→1;
//  - комбинационную часть — итеративно до стабилизации.
//
// Модель выполнения:
//  1. Комбинационные элементы (вентили, сумматоры, MUX, ALU, ROM)
//     пересчитываются итеративно до стабилизации (как раньше).
//  2. Элементы памяти (RS_LATCH, D/JK/T_TRIGGER, REGISTER4, COUNTER4,
//     SHIFT_REG4, RAM8x8, CPU4) обновляют состояние ТОЛЬКО по фронту CLK
//     (или асинхронно для RS_LATCH). Их выходы читаются комбинационной частью.
//
// Симулятор — ЧИСТАЯ функция: (circuit, switchStates, memoryStates) -> SimulationResult.
// Никакого React, никакого Zustand — легко тестировать (Шаг 11).
// ============================================================================

import { COMPONENT_PINS, parsePin, type Bit, type Circuit, type ComponentType } from '@logic/shared';
import {
  evaluateGate,
  evaluateRsLatch,
  evaluateDTrigger,
  evaluateJkTrigger,
  evaluateTTrigger,
  toBit,
  type PinBits,
} from './gates.js';

/** Максимальное число итераций пересчёта комбинационной части. */
export const MAX_ITERATIONS = 50;

/** Значения на всех пинах схемы: ключ "<componentId>.<pinName>" -> Bit. */
export type SignalMap = Record<string, Bit>;

/** Внутреннее состояние компонента (для элементов памяти). */
export type MemoryState = Record<string, number>;

/** Результат симуляции. */
export interface SimulationResult {
  /** Значения на всех пинах (входы и выходы). */
  signals: SignalMap;
  /**
   * Значение на каждом выходном пине компонента.
   * Ключ — id компонента, значение — карта <pinName, Bit>.
   */
  outputs: Record<string, PinBits>;
  /** Обновлённое внутреннее состояние элементов памяти (id -> number). */
  memory: MemoryState;
  /** Сколько итераций потребовалось для стабилизации комбинационной части. */
  iterations: number;
  /** Стабилизировалась ли схема (false = oscillation / превышен лимит). */
  stable: boolean;
}

/** Типы элементов с памятью (обновляются по CLK или асинхронно). */
const MEMORY_TYPES = new Set<ComponentType>([
  'RS_LATCH',
  'D_TRIGGER',
  'JK_TRIGGER',
  'T_TRIGGER',
  'REGISTER4',
  'COUNTER4',
  'SHIFT_REG4',
  'RAM8x8',
  'CPU4',
]);

/** Элементы, срабатывающие по фронту CLK (у RS_LATCH нет CLK). */
const CLOCKED_TYPES = new Set<ComponentType>([
  'D_TRIGGER',
  'JK_TRIGGER',
  'T_TRIGGER',
  'REGISTER4',
  'COUNTER4',
  'SHIFT_REG4',
  'RAM8x8',
  'CPU4',
]);

/**
 * Начальные состояния SWITCH: берём из component.state, по умолчанию 0.
 * Возвращает карту id -> Bit.
 */
export function getInitialSwitchStates(circuit: Circuit): Record<string, Bit> {
  const states: Record<string, Bit> = {};
  for (const c of circuit.components) {
    if (c.type === 'SWITCH') {
      states[c.id] = c.state ?? 0;
    }
  }
  return states;
}

/**
 * Начальное внутреннее состояние элементов памяти.
 * Берём из component.initialState (число); по умолчанию 0.
 * Для REGISTER4/RAM8x8 массив свёртываем в одно число (побитово).
 */
export function getInitialMemory(circuit: Circuit): MemoryState {
  const memory: MemoryState = {};
  for (const c of circuit.components) {
    if (!MEMORY_TYPES.has(c.type)) continue;
    const init = c.initialState;
    if (Array.isArray(init)) {
      // Массив битов свёртываем в число: бит i -> разряд i.
      let value = 0;
      init.forEach((bit, i) => {
        if (bit) value |= 1 << i;
      });
      memory[c.id] = value;
    } else if (typeof init === 'number') {
      memory[c.id] = init;
    } else {
      memory[c.id] = 0;
    }
  }
  return memory;
}

/**
 * Симулирует схему.
 *
 * @param circuit      описание схемы;
 * @param switchStates состояния переключателей (id -> Bit);
 * @param memory       внутреннее состояние элементов памяти (id -> number);
 * @param prevClock    карта значений CLK на прошлом такте (id -> Bit) для детекции фронта.
 *                     Если не передан — фронт не детектируется (первый вызов).
 */
export function simulate(
  circuit: Circuit,
  switchStates?: Record<string, Bit>,
  memory: MemoryState = {},
  prevClock: Record<string, Bit> = {},
): SimulationResult {
  const switches = switchStates ?? getInitialSwitchStates(circuit);

  // Рабочая копия состояния памяти (не мутируем входной аргумент).
  const nextMemory: MemoryState = { ...memory };

  // Входы каждого компонента: id -> { pin -> Bit }.
  const inputs: Record<string, PinBits> = {};
  for (const c of circuit.components) {
    inputs[c.id] = {};
  }

  // Текущие значения на пинах. Ключ — "<id>.<pin>".
  let signals: SignalMap = {};

  // Выходы компонентов: id -> { pin -> Bit }.
  let outputs: Record<string, PinBits> = {};

  // Предыдущий снимок выходов для проверки стабилизации.
  let prevOutputs: Record<string, PinBits> = {};

  let iteration = 0;
  let stable = false;

  for (iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    // 1. Собираем входы из проводов на основе текущих signals.
    for (const c of circuit.components) {
      inputs[c.id] = {};
    }

    for (const wire of circuit.wires) {
      const from = parsePin(wire.from);
      const to = parsePin(wire.to);
      if (!from || !to) continue;
      inputs[to.id][to.pin] = signals[wire.from] ?? 0;
    }

    // 2. Вычисляем выходы всех компонентов.
    const newSignals: SignalMap = {};
    const newOutputs: Record<string, PinBits> = {};

    for (const c of circuit.components) {
      const inPins = inputs[c.id];
      const isMemory = MEMORY_TYPES.has(c.type);

      let outPins: PinBits;

      if (isMemory) {
        // --- Элементы с памятью ---
        const clk = inPins.clk ?? 0;
        const prevClk = prevClock[c.id] ?? 0;
        const risingEdge = CLOCKED_TYPES.has(c.type) && clk === 1 && prevClk === 0;

        const current = nextMemory[c.id] ?? 0;
        const updated = updateMemory(c.type, inPins, current, risingEdge, switches[c.id] ?? 0);
        nextMemory[c.id] = updated;
        outPins = memoryOutputs(c.type, updated);
      } else {
        // --- Комбинационные элементы ---
        const switchState = c.type === 'SWITCH' ? (switches[c.id] ?? 0) : 0;
        outPins = evaluateGate(c.type, inPins, switchState);
      }

      newOutputs[c.id] = outPins;

      // Прописываем значения на выходных пинах.
      for (const [pin, val] of Object.entries(outPins)) {
        newSignals[`${c.id}.${pin}`] = val;
      }

      // Прописываем значения на входных пинах (для отображения в UI).
      for (const [pin, val] of Object.entries(inPins)) {
        newSignals[`${c.id}.${pin}`] = val;
      }
      // Вход LED тоже сохраняем (у LED нет выходов, но вход нужен для индикации).
      if (c.type === 'LED') {
        newSignals[`${c.id}.in`] = inPins.in ?? 0;
      }
    }

    signals = newSignals;

    // 3. Проверяем стабилизацию: выходы не изменились с прошлой итерации.
    stable = isSameOutputs(prevOutputs, newOutputs);
    prevOutputs = newOutputs;

    if (stable) {
      outputs = newOutputs;
      return {
        signals,
        outputs,
        memory: nextMemory,
        iterations: iteration + 1,
        stable: true,
      };
    }
  }

  // Не стабилизировалась за MAX_ITERATIONS (генератор / кольцевой осциллятор).
  return {
    signals,
    outputs: prevOutputs,
    memory: nextMemory,
    iterations: MAX_ITERATIONS,
    stable: false,
  };
}

/**
 * Обновляет внутреннее состояние элемента памяти.
 *
 * @param type        тип компонента;
 * @param inPins      значения на входах;
 * @param current     текущее внутреннее состояние (число);
 * @param risingEdge  true, если на CLK был фронт 0→1 (для тактируемых);
 * @param switchState состояние SWITCH (только для CPU4 с внешней памятью — не используется).
 * @returns новое внутреннее состояние (число).
 */
function updateMemory(
  type: ComponentType,
  inPins: PinBits,
  current: number,
  risingEdge: boolean,
  _switchState: Bit,
): number {
  switch (type) {
    case 'RS_LATCH': {
      // Асинхронная защёлка: реагирует на уровни, а не на фронт.
      const q = evaluateRsLatch(inPins.s ?? 0, inPins.r ?? 0, toBit(current & 1)).q ?? 0;
      return q;
    }

    case 'D_TRIGGER': {
      if (!risingEdge) return current & 1;
      const q = evaluateDTrigger(inPins.d ?? 0, toBit(current & 1)).q ?? 0;
      return q;
    }

    case 'JK_TRIGGER': {
      if (!risingEdge) return current & 1;
      const q = evaluateJkTrigger(inPins.j ?? 0, inPins.k ?? 0, toBit(current & 1)).q ?? 0;
      return q;
    }

    case 'T_TRIGGER': {
      if (!risingEdge) return current & 1;
      const q = evaluateTTrigger(inPins.t ?? 0, toBit(current & 1)).q ?? 0;
      return q;
    }

    case 'REGISTER4': {
      if (!risingEdge || (inPins.en ?? 0) === 0) return current & 0xf;
      const d = readNibble(inPins, 'd');
      return d & 0xf;
    }

    case 'COUNTER4': {
      // Асинхронный сброс: rst=1 обнуляет независимо от CLK.
      if ((inPins.rst ?? 0) === 1) return 0;
      if (!risingEdge || (inPins.en ?? 0) === 0) return current & 0xf;
      return (current + 1) & 0xf;
    }

    case 'SHIFT_REG4': {
      if (!risingEdge || (inPins.en ?? 0) === 0) return current & 0xf;
      // Сдвиг влево: младший бит = din, остальные сдвигаются.
      const din = inPins.din ?? 0;
      return ((current << 1) | din) & 0xf;
    }

    case 'RAM8x8': {
      if (!risingEdge || (inPins.we ?? 0) === 0) return current;
      // Адрес a0..a2, данные d0..d7. Храним одну ячейку (учебное упрощение):
      // текущее значение = последнее записанное слово.
      const d = readByte(inPins, 'd');
      return d & 0xff;
    }

    case 'CPU4': {
      if ((inPins.rst ?? 0) === 1) return 0;
      if (!risingEdge) return current;
      // Учебный CPU4: аккумулятор (младшие 4 бита) и PC (старшие 4 бита).
      // IR (ir0..ir3) задаёт операцию: 0=NOP, 1=INC ACC, 2=DEC ACC, 3=JMP (PC+1).
      const acc = current & 0xf;
      const pc = (current >> 4) & 0xf;
      const ir = readNibble(inPins, 'ir');
      let nextAcc = acc;
      let nextPc = pc;
      switch (ir) {
        case 0x1:
          nextAcc = (acc + 1) & 0xf;
          nextPc = (pc + 1) & 0xf;
          break;
        case 0x2:
          nextAcc = (acc - 1) & 0xf;
          nextPc = (pc + 1) & 0xf;
          break;
        case 0x3:
          nextPc = (pc + 1) & 0xf;
          break;
        default:
          nextPc = (pc + 1) & 0xf;
          break;
      }
      return (nextPc << 4) | nextAcc;
    }

    default:
      return current;
  }
}

/** Формирует карту выходных пинов по внутреннему состоянию элемента памяти. */
function memoryOutputs(type: ComponentType, state: number): PinBits {
  switch (type) {
    case 'RS_LATCH':
    case 'D_TRIGGER':
    case 'JK_TRIGGER':
    case 'T_TRIGGER': {
      const q = toBit(state & 1);
      return { q, nq: q ? 0 : 1 };
    }

    case 'REGISTER4':
    case 'SHIFT_REG4':
    case 'COUNTER4': {
      const out: PinBits = {
        q0: toBit(state & 1),
        q1: toBit((state >> 1) & 1),
        q2: toBit((state >> 2) & 1),
        q3: toBit((state >> 3) & 1),
      };
      if (type === 'COUNTER4') {
        // Перенос при переходе 15 -> 0 (для следующего такта).
        out.carry = state === 0xf ? 1 : 0;
      }
      return out;
    }

    case 'RAM8x8':
      return byteToPins(state & 0xff, 'q');

    case 'CPU4': {
      const acc = state & 0xf;
      const pc = (state >> 4) & 0xf;
      return {
        acc0: toBit(acc & 1),
        acc1: toBit((acc >> 1) & 1),
        acc2: toBit((acc >> 2) & 1),
        acc3: toBit((acc >> 3) & 1),
        pc0: toBit(pc & 1),
        pc1: toBit((pc >> 1) & 1),
        pc2: toBit((pc >> 2) & 1),
        pc3: toBit((pc >> 3) & 1),
        zf: acc === 0 ? 1 : 0,
      };
    }

    default:
      return {};
  }
}

/** Читает 4-битное значение из входов с префиксом (a0..a3, b0..b3, ir0..ir3). */
function readNibble(inputs: PinBits, prefix: string): number {
  return (
    (inputs[`${prefix}0`] ?? 0) |
    ((inputs[`${prefix}1`] ?? 0) << 1) |
    ((inputs[`${prefix}2`] ?? 0) << 2) |
    ((inputs[`${prefix}3`] ?? 0) << 3)
  );
}

/** Читает 8-битное значение из входов с префиксом (d0..d7). */
function readByte(inputs: PinBits, prefix: string): number {
  let value = 0;
  for (let i = 0; i < 8; i++) {
    if (inputs[`${prefix}${i}`]) value |= 1 << i;
  }
  return value;
}

/** Преобразует байт в карту пинов с заданным префиксом (d/q). */
function byteToPins(value: number, prefix: string): PinBits {
  const out: PinBits = {};
  for (let i = 0; i < 8; i++) {
    out[`${prefix}${i}`] = toBit((value >> i) & 1);
  }
  return out;
}

/** Сравнивает две карты выходов (id -> { pin -> Bit }). */
function isSameOutputs(
  a: Record<string, PinBits>,
  b: Record<string, PinBits>,
): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const id of keysA) {
    const pa = a[id];
    const pb = b[id];
    if (!pb) return false;
    const pinsA = Object.keys(pa);
    const pinsB = Object.keys(pb);
    if (pinsA.length !== pinsB.length) return false;
    for (const pin of pinsA) {
      if (pa[pin] !== pb[pin]) return false;
    }
  }
  return true;
}

/**
 * Удобный хелпер: получить значение на конкретном пине.
 */
export function getPinValue(signals: SignalMap, ref: string): Bit {
  return signals[ref] ?? 0;
}

/**
 * Хелпер: значение на конкретном выходном пине компонента.
 */
export function getOutputPin(
  outputs: Record<string, PinBits>,
  componentId: string,
  pin: string,
): Bit {
  return outputs[componentId]?.[pin] ?? 0;
}

/** Список пинов компонента (из контракта) — для UI и тестов. */
export function pinsOf(type: ComponentType): { inputs: string[]; outputs: string[] } {
  return COMPONENT_PINS[type];
}
