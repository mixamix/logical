// ============================================================================
// Универсальный узел микросхемы (IC): отображает компонент с ЛЮБЫМ числом
// входов и выходов. Пины берутся из COMPONENT_PINS по типу компонента.
//
// Используется для всех «сложных» типов (сумматоры, MUX, триггеры, регистры,
// ALU, ROM/RAM, CPU и т.д.). Простые вентили и SWITCH/LED остаются на своих
// узлах (GateNode / SwitchNode / LedNode).
//
//  - входы  — слева, вертикально распределены;
//  - выходы — справа, вертикально распределены;
//  - цвет каждого Handle отражает текущее значение пина (0/1).
// ============================================================================

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { COMPONENT_PINS } from '@logic/shared';
import type { CircuitNodeData } from './types.js';
import { COLORS, GATE_MNEMONICS, INVERTED_GATES, IC_MIN_WIDTH, IC_PIN_STEP } from './constants.js';

type Props = NodeProps & { data: CircuitNodeData };

/** Цвет ручки пина по его значению. */
function pinColor(value: number | undefined): string {
  return (value ?? 0) === 1 ? COLORS.signalOn : COLORS.signalOff;
}

/**
 * Вычисляет вертикальную позицию пина в процентах.
 * Пины равномерно распределяются по высоте узла.
 */
function pinTop(index: number, total: number): string {
  // Один пин — по центру. Несколько — от 15% до 85%.
  if (total <= 1) return '50%';
  const start = 15;
  const end = 85;
  const step = (end - start) / (total - 1);
  return `${start + step * index}%`;
}

export function ICNode({ data }: Props) {
  const { component, inputs, outputs, highlighted } = data;
  const pins = COMPONENT_PINS[component.type];
  const inputPins = pins.inputs;
  const outputPins = pins.outputs;

  // Высота узла зависит от количества пинов (не меньше базовой).
  const rows = Math.max(inputPins.length, outputPins.length, 2);
  const height = Math.max(60, rows * IC_PIN_STEP + 24);

  // Активен ли компонент: хотя бы один выход в 1.
  const isOn = outputPins.some((p) => (outputs[p] ?? 0) === 1);

  return (
    <div
      className="relative flex flex-col items-center justify-center rounded-lg border-2 bg-white shadow-sm transition-colors"
      style={{
        width: IC_MIN_WIDTH,
        minHeight: height,
        borderColor: highlighted
          ? COLORS.highlight
          : isOn
            ? COLORS.signalOn
            : COLORS.nodeBorder,
      }}
    >
      {/* Входы (слева). */}
      {inputPins.map((pin, i) => (
        <div key={`in-${pin}`}>
          <Handle
            id={pin}
            type="target"
            position={Position.Left}
            style={{
              top: pinTop(i, inputPins.length),
              background: pinColor(inputs[pin]),
              width: 8,
              height: 8,
            }}
          />
          <span
            className="pointer-events-none absolute text-[9px] font-medium text-slate-400"
            style={{ top: `calc(${pinTop(i, inputPins.length)} - 6px)`, left: -20 }}
          >
            {pin}
          </span>
        </div>
      ))}

      {/* Центральная подпись: символ + метка. */}
      <div className="flex flex-col items-center px-3 py-1">
        <span className="text-xs font-bold text-slate-800">
          {GATE_MNEMONICS[component.type]}
          {INVERTED_GATES.has(component.type) && (
            <span className="ml-0.5 align-super text-[9px] text-slate-500">▔</span>
          )}
        </span>
        {component.label && (
          <span className="text-[10px] text-slate-500">{component.label}</span>
        )}
      </div>

      {/* Выходы (справа). */}
      {outputPins.map((pin, i) => (
        <div key={`out-${pin}`}>
          <Handle
            id={pin}
            type="source"
            position={Position.Right}
            style={{
              top: pinTop(i, outputPins.length),
              background: pinColor(outputs[pin]),
              width: 8,
              height: 8,
            }}
          />
          <span
            className="pointer-events-none absolute text-[9px] font-medium text-slate-400"
            style={{ top: `calc(${pinTop(i, outputPins.length)} - 6px)`, right: -22 }}
          >
            {pin}
          </span>
        </div>
      ))}
    </div>
  );
}
