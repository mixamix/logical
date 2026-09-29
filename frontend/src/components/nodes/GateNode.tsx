// ============================================================================
// Узел логического вентиля: NOT / AND / OR / XOR / NAND / NOR.
//  - входы a (и b для двухвходовых) слева;
//  - выход out справа;
//  - цвет границы зависит от выходного сигнала.
// ============================================================================

import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { CircuitNodeData } from './types.js';
import { COLORS, GATE_SYMBOLS, NODE_WIDTH } from './constants.js';

type Props = NodeProps & { data: CircuitNodeData };

/** Вентили с двумя входами. */
const TWO_INPUT_GATES = new Set(['AND', 'OR', 'XOR', 'NAND', 'NOR']);

export function GateNode({ data }: Props) {
  const { component, output, inputs, highlighted } = data;
  const isOn = output === 1;
  const hasTwoInputs = TWO_INPUT_GATES.has(component.type);

  return (
    <div
      className="relative flex flex-col items-center justify-center rounded-lg border-2 bg-white px-2 shadow-sm transition-colors"
      style={{
        width: NODE_WIDTH,
        height: 60,
        borderColor: highlighted
          ? COLORS.highlight
          : isOn
            ? COLORS.signalOn
            : COLORS.nodeBorder,
      }}
    >
      {/* Вход a. */}
      <Handle
        id="a"
        type="target"
        position={Position.Left}
        style={{
          top: hasTwoInputs ? '30%' : '50%',
          background: (inputs.a ?? 0) === 1 ? COLORS.signalOn : COLORS.signalOff,
          width: 10,
          height: 10,
        }}
      />

      {/* Вход b — только для двухвходовых вентилей. */}
      {hasTwoInputs && (
        <Handle
          id="b"
          type="target"
          position={Position.Left}
          style={{
            top: '70%',
            background: (inputs.b ?? 0) === 1 ? COLORS.signalOn : COLORS.signalOff,
            width: 10,
            height: 10,
          }}
        />
      )}

      {/* Обозначение вентиля. */}
      <span className="text-sm font-bold text-slate-800">{GATE_SYMBOLS[component.type]}</span>
      {component.label && (
        <span className="text-[10px] text-slate-500">{component.label}</span>
      )}

      {/* Выход out. */}
      <Handle
        id="out"
        type="source"
        position={Position.Right}
        style={{ background: isOn ? COLORS.signalOn : COLORS.signalOff, width: 10, height: 10 }}
      />
    </div>
  );
}
