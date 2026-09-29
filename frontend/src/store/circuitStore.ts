// ============================================================================
// Zustand-стор: доменное состояние приложения.
//
// Хранит:
//  - circuit — контракт схемы;
//  - signals — значения на всех пинах (результат симуляции);
//  - outputs — значение на выходе каждого компонента;
//  - highlight — id для подсветки от AI;
//  - switching — состояния SWITCH (переключателей).
//
// НЕ хранит nodes/edges React Flow — это локальное состояние canvas (Шаг 4).
//
// Шаг 8: схема сохраняется в localStorage и восстанавливается при загрузке.
// ============================================================================

import { create } from 'zustand';
import type { Bit, Circuit } from '@logic/shared';
import {
  simulate,
  getInitialSwitchStates,
  type SignalMap,
} from '../simulator/index.js';
import { clearCircuit, loadCircuit, saveCircuit } from './persistence.js';

/** Пустая схема. */
export const EMPTY_CIRCUIT: Circuit = {
  version: '1.0',
  components: [],
  wires: [],
};

interface CircuitState {
  /** Текущая схема. */
  circuit: Circuit;
  /** Состояния переключателей (id SWITCH -> 0/1). */
  switches: Record<string, Bit>;
  /** Значения на всех пинах схемы. */
  signals: SignalMap;
  /** Значение на выходе каждого компонента. */
  outputs: Record<string, Bit>;
  /** id компонентов/проводов для подсветки. */
  highlight: string[];
  /** Стабилизировалась ли схема. */
  stable: boolean;

  /** Заменить схему (например, ответом AI) и пересчитать. */
  setCircuit: (circuit: Circuit) => void;
  /** Переключить SWITCH и пересчитать. */
  toggleSwitch: (id: string) => void;
  /** Установить подсветку от AI. */
  setHighlight: (ids: string[]) => void;
  /** Сбросить схему в пустую. */
  reset: () => void;
  /** Пересчитать схему (внутренний хелпер). */
  recompute: (circuit?: Circuit, switches?: Record<string, Bit>) => void;
}

/**
 * Считает симуляцию и возвращает срез состояния.
 * Единая точка входа, чтобы не дублировать логику в экшенах.
 */
function computeState(circuit: Circuit, switches: Record<string, Bit>) {
  const result = simulate(circuit, switches);
  return {
    signals: result.signals,
    outputs: result.outputs,
    stable: result.stable,
  };
}

/**
 * Схема при инициализации: сохранённая в localStorage (если валидна)
 * или пустая. Читаем один раз при создании стора.
 */
const initialCircuit = loadCircuit() ?? EMPTY_CIRCUIT;

/** Начальные состояния SWITCH берём из восстановленной схемы. */
const initialSwitches = getInitialSwitchStates(initialCircuit);

export const useCircuitStore = create<CircuitState>((set, get) => ({
  circuit: initialCircuit,
  switches: initialSwitches,
  ...computeState(initialCircuit, initialSwitches),
  highlight: [],

  setCircuit: (circuit) => {
    // При новой схеме сбрасываем SWITCH к их начальным состояниям из контракта.
    const switches = getInitialSwitchStates(circuit);
    set({
      circuit,
      switches,
      ...computeState(circuit, switches),
    });
    // Шаг 8: сохраняем схему, чтобы пережила перезагрузку страницы.
    saveCircuit(circuit);
  },

  toggleSwitch: (id) => {
    const { circuit, switches } = get();
    const next: Record<string, Bit> = {
      ...switches,
      [id]: switches[id] === 1 ? 0 : 1,
    };
    set({
      switches: next,
      ...computeState(circuit, next),
    });
  },

  setHighlight: (ids) => set({ highlight: ids }),

  reset: () => {
    // Шаг 8: очищаем и стор, и localStorage.
    clearCircuit();
    set({
      circuit: EMPTY_CIRCUIT,
      switches: {},
      signals: {},
      outputs: {},
      highlight: [],
      stable: true,
    });
  },

  recompute: (circuitArg, switchesArg) => {
    const circuit = circuitArg ?? get().circuit;
    const switches = switchesArg ?? get().switches;
    set(computeState(circuit, switches));
  },
}));
