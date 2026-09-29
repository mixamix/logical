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
 * Преобразует Circuit + сигналы в массив узлов React Flow.
 */
export function circuitToNodes(
  circuit: Circuit,
  signals: SignalMap = {},
  outputs: Record<string, Bit> = {},
  highlight: string[] = [],
): CircuitNode[] {
  const highlighted = new Set(highlight);

  return circuit.components.map((component) => {
    const data: CircuitNodeData = {
      component,
      output: outputs[component.id] ?? 0,
      inputs: collectInputs(component.id, component.type, signals),
      highlighted: highlighted.has(component.id),
    };

    return {
      id: component.id,
      type: 'circuit',
      position: { x: component.pos[0], y: component.pos[1] },
      data,
      draggable: true,
      connectable: false,
      deletable: false,
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
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: stroke,
        width: 15,
        height: 15,
      },
      selectable: false,
      deletable: false,
      zIndex: i,
    };
  });
}
