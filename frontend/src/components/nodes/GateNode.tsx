// ============================================================================
// Узел логического вентиля: NOT / AND / OR / XOR / NAND / NOR.
//  - входы a (и b для двухвходовых) слева;
//  - выход out справа;
//  - цвет границы зависит от выходного сигнала.
// ============================================================================

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { COMPONENT_PINS } from '@logic/shared';
import type { CircuitNodeData } from './types.js';
import { COLORS, GATE_MNEMONICS, INVERTED_GATES, NODE_WIDTH } from './constants.js';

type Props = NodeProps & { data: CircuitNodeData };

/**
 * Вентили, которые рисует GateNode: фиксированный набор пинов a/b/c и выход out.
 * Входы/выходы берём из COMPONENT_PINS, чтобы не дублировать список вручную.
 */
function pinColor(value: number | undefined): string {
  return (value ?? 0) === 1 ? COLORS.signalOn : COLORS.signalOff;
}

/** Вертикальная позиция пина в процентах (равномерно по высоте). */
function pinTop(index: number, total: number): string {
  if (total <= 1) return '50%';
  const start = 25;
  const end = 75;
  const step = (end - start) / (total - 1);
  return `${start + step * index}%`;
}

export function GateNode({ data }: Props) {
  const { component, output, inputs, highlighted } = data;
  const isOn = output === 1;

  // Все входные пины этого типа (a, b, для трёхвходовых — ещё c).
  const inputPins = COMPONENT_PINS[component.type].inputs;

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
      {/* Входы (a, b, c — сколько есть у данного вентиля). */}
      {inputPins.map((pin, i) => (
        <div key={`in-${pin}`}>
          <Handle
            id={pin}
            type="target"
            position={Position.Left}
            style={{
              top: pinTop(i, inputPins.length),
              background: pinColor(inputs[pin]),
              width: 10,
              height: 10,
            }}
          />
          <span
            className="pointer-events-none absolute text-[9px] font-medium text-slate-400"
            style={{ top: `calc(${pinTop(i, inputPins.length)} - 6px)`, left: -14 }}
          >
            {pin}
          </span>
        </div>
      ))}

      {/* Мнемоническое обозначение вентиля по ГОСТ (со штрихом инверсии при необходимости). */}
      <span className="text-base font-bold text-slate-800">
        {GATE_MNEMONICS[component.type]}
        {INVERTED_GATES.has(component.type) && (
          <span className="ml-0.5 align-super text-[10px] text-slate-500">▔</span>
        )}
      </span>
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
      <span
        className="pointer-events-none absolute text-[9px] font-medium text-slate-400"
        style={{ top: 'calc(50% - 6px)', right: -16 }}
      >
        out
      </span>
    </div>
  );
}
