// ============================================================================
// Маппинг контракта схемы (Circuit) + сигналов симуляции в структуры React Flow.
// Единственное место, где происходит это преобразование.
// ============================================================================

import { MarkerType } from '@xyflow/react';
import { COMPONENT_PINS, parsePin, type Bit, type Circuit } from '@logic/shared';
import type {
  CircuitNode,
  CircuitEdge,
  CircuitNodeData,
  CircuitEdgeData,
} from '../nodes/types.js';
import { COLORS } from '../nodes/constants.js';
import type { SignalMap } from '../../simulator/index.js';
import type { PinBits } from '../../simulator/gates.js';

/** Собирает значения входов компонента из карты сигналов. */
function collectInputs(
  componentId: string,
  type: keyof typeof COMPONENT_PINS,
  signals: SignalMap,
): Record<string, Bit> {
  const result: Record<string, Bit> = {};
  for (const pin of COMPONENT_PINS[type].inputs) {
    result[pin] = signals[`${componentId}.${pin}`] ?? 0;
  }
  return result;
}

/**
 * Собирает значения всех выходов компонента.
 * Если симуляция вернула карту выходов — берём её; иначе восстанавливаем
 * из плоской карты сигналов по списку выходных пинов типа.
 */
function collectOutputs(
  componentId: string,
  type: keyof typeof COMPONENT_PINS,
  signals: SignalMap,
  outputs: Record<string, PinBits>,
): Record<string, Bit> {
  const result: Record<string, Bit> = {};
  for (const pin of COMPONENT_PINS[type].outputs) {
    result[pin] =
      outputs[componentId]?.[pin] ?? signals[`${componentId}.${pin}`] ?? 0;
  }
  return result;
}

/**
 * Преобразует Circuit + сигналы в массив узлов React Flow.
 */
export function circuitToNodes(
  circuit: Circuit,
  signals: SignalMap = {},
  outputs: Record<string, PinBits> = {},
  highlight: string[] = [],
): CircuitNode[] {
  const highlighted = new Set(highlight);

  return circuit.components.map((component) => {
    const outPins = collectOutputs(component.id, component.type, signals, outputs);
    // «Главный» выход: первый выходной пин типа (для однодвыходных — out).
    const primaryPin = COMPONENT_PINS[component.type].outputs[0];
    const data: CircuitNodeData = {
      component,
      output: primaryPin ? (outPins[primaryPin] ?? 0) : 0,
      outputs: outPins,
      inputs: collectInputs(component.id, component.type, signals),
      highlighted: highlighted.has(component.id),
    };

    return {
      id: component.id,
      type: 'circuit',
      position: { x: component.pos[0], y: component.pos[1] },
      data,
      draggable: true,
      connectable: true,
      deletable: true,
    };
  });
}

/**
 * Преобразует wires + сигналы в рёбра React Flow.
 * Цвет ребра зависит от значения сигнала на проводе.
 */
export function wiresToEdges(
  circuit: Circuit,
  signals: SignalMap = {},
  highlight: string[] = [],
): CircuitEdge[] {
  const highlighted = new Set(highlight);

  return circuit.wires.map((wire, i) => {
    const id = `${wire.from}->${wire.to}`;
    const signal: Bit = signals[wire.from] ?? 0;
    const isHighlighted =
      highlighted.has(id) || highlighted.has(wire.from) || highlighted.has(wire.to);

    // Подсветка AI важнее цвета сигнала.
    const stroke = isHighlighted
      ? COLORS.highlight
      : signal === 1
        ? COLORS.signalOn
        : COLORS.signalOff;

    const from = parsePin(wire.from);
    const to = parsePin(wire.to);
    if (!from || !to) {
      throw new Error(`Некорректный провод: ${wire.from} -> ${wire.to}`);
    }

    const data: CircuitEdgeData = {
      signal,
      highlighted: isHighlighted,
    };

    return {
      id,
      source: from.id,
      sourceHandle: from.pin,
      target: to.id,
      targetHandle: to.pin,
      type: 'smoothstep',
      data,
      animated: signal === 1,
      style: { stroke, strokeWidth: isHighlighted ? 3 : 2 },
      // Широкий невидимый «коридор» для попадания мышью по тонкому проводу.
      interactionWidth: 24,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: stroke,
        width: 15,
        height: 15,
      },
      selectable: true,
      deletable: true,
      focusable: true,
      zIndex: i,
    };
  });
}
