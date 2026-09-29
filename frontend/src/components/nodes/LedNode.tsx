// ============================================================================
// Узел LED: индикатор выхода схемы.
//  - вход in (слева);
//  - загорается зелёным при сигнале 1.
// ============================================================================

import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { CircuitNodeData } from './types.js';
import { COLORS, LED_WIDTH } from './constants.js';

type Props = NodeProps & { data: CircuitNodeData };

export function LedNode({ data }: Props) {
  const { component, inputs, highlighted } = data;
  const isOn = (inputs.in ?? 0) === 1;

  return (
    <div
      className="relative flex flex-col items-center justify-center rounded-lg border-2 px-2 shadow-sm transition-colors"
      style={{
        width: LED_WIDTH,
        height: 60,
        borderColor: highlighted ? COLORS.highlight : COLORS.nodeBorder,
        backgroundColor: COLORS.nodeBg,
      }}
    >
      {/* Вход in. */}
      <Handle
        id="in"
        type="target"
        position={Position.Left}
        style={{ background: isOn ? COLORS.signalOn : COLORS.signalOff, width: 10, height: 10 }}
      />
      <span
        className="pointer-events-none absolute text-[9px] font-medium text-slate-400"
        style={{ top: 'calc(50% - 6px)', left: -14 }}
      >
        in
      </span>

      {/* Лампочка. */}
      <div
        className="mb-1 h-5 w-5 rounded-full border transition-all"
        style={{
          backgroundColor: isOn ? COLORS.signalOn : '#e2e8f0',
          borderColor: isOn ? COLORS.signalOn : COLORS.nodeBorder,
          boxShadow: isOn ? `0 0 10px ${COLORS.signalOn}` : 'none',
        }}
      />

      {/* Подпись LED. */}
      <span className="text-[10px] font-semibold text-slate-500">
        LED{component.label ? ` ${component.label}` : ''}
      </span>
    </div>
  );
}
