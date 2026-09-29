// ============================================================================
// Движок симуляции логической схемы.
//
// Подход: итеративный пересчёт (вариант B).
//  - граф может содержать петли (RS-триггеры и т.п.);
//  - топологическая сортировка не используется;
//  - за фиксированное число итераций значения стабилизируются;
//  - для DAG сходимость за глубину схемы, для петель — эвристика.
//
// Симулятор — ЧИСТАЯ функция: (circuit, switchStates) -> SimulationResult.
// Никакого React, никакого Zustand — легко тестировать.
// ============================================================================

import { parsePin, type Bit, type Circuit } from '@logic/shared';
import { evaluateGate } from './gates.js';

/** Максимальное число итераций пересчёта. */
export const MAX_ITERATIONS = 50;

/** Значения на всех пинах схемы: ключ "<componentId>.<pinName>" -> Bit. */
export type SignalMap = Record<string, Bit>;

/** Результат симуляции. */
export interface SimulationResult {
  /** Значения на всех пинах (входы и выходы). */
  signals: SignalMap;
  /** Значение на выходе каждого компонента (удобно для UI). */
  outputs: Record<string, Bit>;
  /** Сколько итераций потребовалось для стабилизации. */
  iterations: number;
  /** Стабилизировалась ли схема (false = oscillation / превышен лимит). */
  stable: boolean;
}

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
 * Симулирует схему итеративно до стабилизации.
 *
 * @param circuit описание схемы;
 * @param switchStates состояния переключателей (id -> Bit);
 *                если не передан — берётся из circuit.components[].state.
 */
export function simulate(
  circuit: Circuit,
  switchStates?: Record<string, Bit>,
): SimulationResult {
  const switches = switchStates ?? getInitialSwitchStates(circuit);

  // Входы каждого компонента: id -> { pin -> Bit }.
  // Инициализируем нулями по контракту пинов, чтобы отсутствующие входы были 0.
  const inputs: Record<string, Record<string, Bit>> = {};
  for (const c of circuit.components) {
    inputs[c.id] = {};
  }

  // Текущие значения на пинах. Ключ — "<id>.<pin>".
  let signals: SignalMap = {};

  // Предыдущий снимок выходов для проверки стабилизации.
  let prevOutputs: Record<string, Bit> = {};

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

      // Значение на пине-источнике (0, если ещё не вычислено).
      const value: Bit = signals[wire.from] ?? 0;
      // Записываем во вход приёмника под именем пина.
      inputs[to.id][to.pin] = value;
    }

    // 2. Вычисляем выходы всех компонентов.
    const newSignals: SignalMap = {};
    const newOutputs: Record<string, Bit> = {};

    for (const c of circuit.components) {
      const switchState: Bit = c.type === 'SWITCH' ? (switches[c.id] ?? 0) : 0;
      const output = evaluateGate(c.type, inputs[c.id] as { a?: Bit; b?: Bit }, switchState);

      newOutputs[c.id] = output;

      // Прописываем значения на выходных пинах.
      if (c.type === 'SWITCH') {
        newSignals[`${c.id}.out`] = output;
      } else if (c.type !== 'LED') {
        newSignals[`${c.id}.out`] = output;
      }

      // Прописываем значения на входных пинах (для отображения в UI).
      for (const [pin, val] of Object.entries(inputs[c.id])) {
        newSignals[`${c.id}.${pin}`] = val;
      }
      // Вход LED тоже сохраняем.
      if (c.type === 'LED') {
        newSignals[`${c.id}.in`] = inputs[c.id].in ?? 0;
      }
    }

    signals = newSignals;

    // 3. Проверяем стабилизацию: выходы не изменились с прошлой итерации.
    stable = isSameOutputs(prevOutputs, newOutputs);
    prevOutputs = newOutputs;

    if (stable) {
      return { signals, outputs: newOutputs, iterations: iteration + 1, stable: true };
    }
  }

  // Не стабилизировалась за MAX_ITERATIONS (генератор / кольцевой осциллятор).
  return { signals, outputs: prevOutputs, iterations: MAX_ITERATIONS, stable: false };
}

/** Сравнивает две карты выходов. */
function isSameOutputs(a: Record<string, Bit>, b: Record<string, Bit>): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const k of keysA) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}

/**
 * Удобный хелпер: получить значение на конкретном пине.
 * parsePin уже импортирован для внутренних нужд.
 */
export function getPinValue(signals: SignalMap, ref: string): Bit {
  return signals[ref] ?? 0;
}
