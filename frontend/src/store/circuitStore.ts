// ============================================================================
// Zustand-стор: доменное состояние приложения (расширенный, Шаг 13.1b).
//
// Хранит:
//  - circuit — контракт схемы;
//  - signals — значения на всех пинах (результат симуляции);
//  - outputs — карта выходных пинов каждого компонента (id -> {pin -> Bit});
//  - memory  — внутреннее состояние элементов памяти (id -> number);
//  - prevClock — предыдущие значения CLK (для детекции фронта);
//  - highlight — id для подсветки от AI;
//  - switches  — состояния SWITCH.
//
// Шаг 13: добавлена кнопка «ТАКТ» (tick), которая генерирует фронт CLK
//          для всех тактируемых элементов сразу.
// ============================================================================

import { create } from 'zustand';
import type { Bit, Circuit, Component, ComponentType } from '@logic/shared';
import { COMPONENT_PINS, parsePin } from '@logic/shared';
import {
  simulate,
  getInitialSwitchStates,
  getInitialMemory,
  type SignalMap,
  type MemoryState,
} from '../simulator/index.js';
import type { PinBits } from '../simulator/gates.js';
import { clearCircuit, loadCircuit, saveCircuit } from './persistence.js';
import { GATE_SYMBOLS } from '../components/nodes/constants.js';

/** Типы с внутренней памятью (нужно начальное состояние). */
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
  /** Карта выходных пинов каждого компонента (id -> {pin -> Bit}). */
  outputs: Record<string, PinBits>;
  /** Внутреннее состояние элементов памяти (id -> number). */
  memory: MemoryState;
  /** Предыдущие значения CLK (id -> Bit) для детекции фронта. */
  prevClock: Record<string, Bit>;
  /** id компонентов/проводов для подсветки. */
  highlight: string[];
  /** Стабилизировалась ли схема. */
  stable: boolean;

  /** Заменить схему (например, ответом AI) и пересчитать. */
  setCircuit: (circuit: Circuit) => void;
  /** Добавить компонент выбранного типа в схему (палитра). */
  addComponent: (type: ComponentType) => void;
  /** Удалить компонент и все его провода. */
  removeComponent: (id: string) => void;
  /** Обновить позицию узла (после перетаскивания). */
  updateNodePosition: (id: string, pos: [number, number]) => void;
  /** Соединить два пина проводом (палитра/ручное соединение). */
  addWire: (from: string, to: string) => boolean;
  /** Разорвать провод по паре пинов. */
  removeWire: (from: string, to: string) => void;
  /** Проверить допустимость соединения (для подсветки в UI). */
  canConnect: (from: string, to: string) => boolean;
  /** Переключить SWITCH и пересчитать. */
  toggleSwitch: (id: string) => void;
  /** Сгенерировать тактовый импульс (фронт 0→1 → снова 0) для всех CLK. */
  tick: () => void;
  /** Установить подсветку от AI. */
  setHighlight: (ids: string[]) => void;
  /** Сбросить схему в пустую. */
  reset: () => void;
  /** Пересчитать схему (внутренний хелпер). */
  recompute: (
    circuit?: Circuit,
    switches?: Record<string, Bit>,
    memory?: MemoryState,
    prevClock?: Record<string, Bit>,
  ) => void;
}

/**
 * Проверяет, допустимо ли соединение двух пинов (from = выход, to = вход).
 * Чистая функция — используется и при добавлении провода, и для подсветки
 * валидных/невалидных целей во время протягивания в UI.
 *
 * @returns true, если соединение можно создать.
 */
export function canConnect(circuit: Circuit, from: string, to: string): boolean {
  const fromPin = parsePin(from);
  const toPin = parsePin(to);
  if (!fromPin || !toPin) return false;
  // Нельзя соединять компонент сам с собой.
  if (fromPin.id === toPin.id) return false;

  const byId = new Map(circuit.components.map((c) => [c.id, c]));
  const src = byId.get(fromPin.id);
  const dst = byId.get(toPin.id);
  if (!src || !dst) return false;

  // Пин-источник должен быть выходом, пин-приёмник — входом.
  if (!COMPONENT_PINS[src.type].outputs.includes(fromPin.pin)) return false;
  if (!COMPONENT_PINS[dst.type].inputs.includes(toPin.pin)) return false;

  // Не дублируем уже существующий провод.
  if (circuit.wires.some((w) => w.from === from && w.to === to)) return false;

  return true;
}

/**
 * Считает симуляцию и возвращает срез состояния.
 * Единая точка входа, чтобы не дублировать логику в экшенах.
 */
function computeState(
  circuit: Circuit,
  switches: Record<string, Bit>,
  memory: MemoryState,
  prevClock: Record<string, Bit>,
) {
  const result = simulate(circuit, switches, memory, prevClock);
  return {
    signals: result.signals,
    outputs: result.outputs,
    memory: result.memory,
    stable: result.stable,
  };
}

/**
 * Собирает карту текущих значений CLK на входах тактируемых элементов.
 * Нужна, чтобы при следующем такте определить фронт 0→1.
 */
function readClockLevels(
  circuit: Circuit,
  signals: SignalMap,
  switches: Record<string, Bit>,
): Record<string, Bit> {
  const clk: Record<string, Bit> = {};
  for (const c of circuit.components) {
    if (c.type === 'SWITCH') continue;
    // CLK может приходить по проводу — берём значение с пина clk.
    clk[c.id] = signals[`${c.id}.clk`] ?? 0;
  }
  // Для элементов, где CLK задаётся SWITCH-ом напрямую, значение уже в signals.
  void switches;
  return clk;
}

/**
 * Схема при инициализации: сохранённая в localStorage (если валидна)
 * или пустая. Читаем один раз при создании стора.
 */
const initialCircuit = loadCircuit() ?? EMPTY_CIRCUIT;

/** Начальные состояния SWITCH берём из восстановленной схемы. */
const initialSwitches = getInitialSwitchStates(initialCircuit);

/** Начальное состояние памяти берём из восстановленной схемы. */
const initialMemory = getInitialMemory(initialCircuit);

/** Начальный снимок CLK (нулевой — фронт не детектируется при старте). */
const initialClock: Record<string, Bit> = {};

const initialSim = simulate(initialCircuit, initialSwitches, initialMemory, initialClock);

/** Уровни CLK после первой симуляции — база для следующего такта. */
const initialClockLevels = readClockLevels(initialCircuit, initialSim.signals, initialSwitches);

export const useCircuitStore = create<CircuitState>((set, get) => ({
  circuit: initialCircuit,
  switches: initialSwitches,
  signals: initialSim.signals,
  outputs: initialSim.outputs,
  memory: initialSim.memory,
  prevClock: initialClockLevels,
  highlight: [],
  stable: initialSim.stable,

  setCircuit: (circuit) => {
    // При новой схеме сбрасываем SWITCH и память к начальным состояниям.
    const switches = getInitialSwitchStates(circuit);
    const memory = getInitialMemory(circuit);
    const sim = simulate(circuit, switches, memory, {});
    const clockLevels = readClockLevels(circuit, sim.signals, switches);
    set({
      circuit,
      switches,
      signals: sim.signals,
      outputs: sim.outputs,
      memory: sim.memory,
      prevClock: clockLevels,
      stable: sim.stable,
    });
    saveCircuit(circuit);
  },

  toggleSwitch: (id) => {
    const { circuit, switches, memory, prevClock } = get();
    const next: Record<string, Bit> = {
      ...switches,
      [id]: switches[id] === 1 ? 0 : 1,
    };
    set({
      switches: next,
      ...computeState(circuit, next, memory, prevClock),
    });
  },

  /**
   * Тактовый импульс: имитируем фронт 0→1, затем возвращаем 0.
   * Элементы, у которых CLK приходит по проводу от SWITCH, не затрагиваются —
   * для них такт делается переключением SWITCH. Эта кнопка генерирует такт
   * для элементов, чей clk-пин «висит» (не подключён) и должен считаться
   * управляемым извне.
   *
   * Реализация: прогоняем симуляцию с искусственным CLK=1, затем с CLK=0.
   * Элементы с памятью увидят фронт на первой итерации.
   */
  tick: () => {
    const { circuit, switches, memory } = get();

    // Подаём CLK=1 на все тактируемые элементы (фронт 0→1).
    const clockHigh: Record<string, Bit> = {};
    for (const c of circuit.components) clockHigh[c.id] = 1;
    const highSim = simulate(circuit, switches, memory, clockHigh);

    // Возвращаем CLK=0 (prevClock остаётся 1, чтобы следующий такт снова
    // детектировал фронт 0→1 после сброса).
    const clockLow: Record<string, Bit> = {};
    for (const c of circuit.components) clockLow[c.id] = 1;
    const lowSim = simulate(circuit, switches, highSim.memory, clockLow);

    set({
      signals: lowSim.signals,
      outputs: lowSim.outputs,
      memory: lowSim.memory,
      prevClock: clockLow,
      stable: lowSim.stable,
    });
  },

  setHighlight: (ids) => set({ highlight: ids }),

  addComponent: (type) => {
    const { circuit } = get();
    // Генерируем уникальный id на основе типа: e.g. "and1", "and2", "fa1".
    const base = type.toLowerCase().replace(/[^a-z0-9]/g, '');
    const existing = new Set(circuit.components.map((c) => c.id));
    let n = 1;
    let id = `${base}${n}`;
    while (existing.has(id)) {
      n += 1;
      id = `${base}${n}`;
    }

    // Новая позиция: сетка 40px, со смещением, чтобы узлы не накладывались.
    const count = circuit.components.length;
    const col = count % 4;
    const row = Math.floor(count / 4);
    const pos: [number, number] = [120 + col * 200, 120 + row * 160];

    const component: Component = {
      id,
      type,
      label: type === 'SWITCH' || type === 'LED' ? undefined : GATE_SYMBOLS[type],
      pos,
    };
    // SWITCH получает начальное состояние 0.
    if (type === 'SWITCH') component.state = 0;

    // Элементы памяти получают нулевое начальное состояние.
    if (MEMORY_TYPES.has(type)) {
      const outs = COMPONENT_PINS[type].outputs.length;
      component.initialState = outs > 1 ? Array(outs).fill(0) : 0;
    }

    const nextCircuit: Circuit = {
      ...circuit,
      components: [...circuit.components, component],
    };
    get().setCircuit(nextCircuit);
  },

  removeComponent: (id) => {
    const { circuit } = get();
    const nextCircuit: Circuit = {
      ...circuit,
      components: circuit.components.filter((c) => c.id !== id),
      // Удаляем все провода, подключённые к этому компоненту.
      wires: circuit.wires.filter(
        (w) => !w.from.startsWith(`${id}.`) && !w.to.startsWith(`${id}.`),
      ),
    };
    get().setCircuit(nextCircuit);
  },

  addWire: (from, to) => {
    const { circuit } = get();
    if (!canConnect(circuit, from, to)) return false;

    // У одного входа может быть только один источник — заменяем старый провод.
    const wires = circuit.wires.filter((w) => w.to !== to);
    wires.push({ from, to });

    get().setCircuit({ ...circuit, wires });
    return true;
  },

  canConnect: (from, to) => canConnect(get().circuit, from, to),

  removeWire: (from, to) => {
    const { circuit } = get();
    const wires = circuit.wires.filter(
      (w) => !(w.from === from && w.to === to),
    );
    if (wires.length === circuit.wires.length) return;
    get().setCircuit({ ...circuit, wires });
  },

  updateNodePosition: (id, pos) => {
    const { circuit } = get();
    const nextCircuit: Circuit = {
      ...circuit,
      components: circuit.components.map((c) =>
        c.id === id ? { ...c, pos } : c,
      ),
    };
    // Позиция не влияет на симуляцию — обновляем и сохраняем без пересчёта.
    set({ circuit: nextCircuit });
    saveCircuit(nextCircuit);
  },

  reset: () => {
    clearCircuit();
    set({
      circuit: EMPTY_CIRCUIT,
      switches: {},
      signals: {},
      outputs: {},
      memory: {},
      prevClock: {},
      highlight: [],
      stable: true,
    });
  },

  recompute: (circuitArg, switchesArg, memoryArg, prevClockArg) => {
    const circuit = circuitArg ?? get().circuit;
    const switches = switchesArg ?? get().switches;
    const memory = memoryArg ?? get().memory;
    const prevClock = prevClockArg ?? get().prevClock;
    set(computeState(circuit, switches, memory, prevClock));
  },
}));
