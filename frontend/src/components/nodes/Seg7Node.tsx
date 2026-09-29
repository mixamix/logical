// ============================================================================
// Узел 7-сегментного LED-индикатора (SEG7).
//  - 8 входов слева: сегменты a..g и десятичная точка dp;
//  - отображает цифру/символ по включённым сегментам (как реальный индикатор);
//  - сегменты — трапеции/прямоугольники, загораются красным при сигнале 1.
// ============================================================================

import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { CircuitNodeData } from './types.js';
import { COLORS } from './constants.js';

type Props = NodeProps & { data: CircuitNodeData };

/** Цвет пина по значению. */
function pinColor(value: number | undefined): string {
  return (value ?? 0) === 1 ? COLORS.signalOn : COLORS.signalOff;
}

/** Вертикальная позиция пина (равномерно по высоте). */
function pinTop(index: number, total: number): string {
  const start = 12;
  const end = 88;
  const step = total > 1 ? (end - start) / (total - 1) : 0;
  return `${start + step * index}%`;
}

/** Цвет сегмента: зажжённый — ярко-красный, погашенный — бледный. */
function segColor(on: boolean): string {
  return on ? '#ef4444' : '#f1f5f9';
}

/** Цвет обводки сегмента (незажжённые видны тонкой рамкой). */
const SEG_BORDER = '#e2e8f0';

/**
 * Раскладка сегментов внутри корпуса индикатора (в долях от ширины/высоты).
 * a — верх, b — верх-право, c — низ-право, d — низ, e — низ-лево, f — верх-лево, g — середина.
 */
const SEG_STYLE: Record<string, React.CSSProperties> = {
  a: { top: '8%', left: '18%', width: '64%', height: '8%' },
  b: { top: '17%', right: '8%', width: '9%', height: '30%' },
  c: { bottom: '17%', right: '8%', width: '9%', height: '30%' },
  d: { bottom: '8%', left: '18%', width: '64%', height: '8%' },
  e: { bottom: '17%', left: '8%', width: '9%', height: '30%' },
  f: { top: '17%', left: '8%', width: '9%', height: '30%' },
  g: { top: '46%', left: '18%', width: '64%', height: '8%' },
};

const SEGMENT_KEYS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'dp'] as const;

export function Seg7Node({ data }: Props) {
  const { component, inputs, highlighted } = data;
  // Есть ли хотя бы один зажжённый сегмент.
  const anyOn = SEGMENT_KEYS.some((k) => (inputs[k] ?? 0) === 1);

  return (
    <div
      className="relative rounded-lg border-2 bg-slate-800 p-2 shadow-sm transition-colors"
      style={{
        width: 110,
        height: 140,
        borderColor: highlighted ? COLORS.highlight : anyOn ? '#ef4444' : COLORS.nodeBorder,
      }}
    >
      {/* Входы сегментов слева. */}
      {SEGMENT_KEYS.map((pin, i) => (
        <div key={pin}>
          <Handle
            id={pin}
            type="target"
            position={Position.Left}
            style={{
              top: pinTop(i, SEGMENT_KEYS.length),
              background: pinColor(inputs[pin]),
              width: 8,
              height: 8,
            }}
          />
          <span
            className="pointer-events-none absolute text-[9px] font-medium text-slate-300"
            style={{ top: `calc(${pinTop(i, SEGMENT_KEYS.length)} - 6px)`, left: -14 }}
          >
            {pin}
          </span>
        </div>
      ))}

      {/* Корпус индикатора: 7 сегментов + десятичная точка. */}
      <div className="relative mx-auto mt-1 h-[80px] w-[64px] rounded bg-slate-900">
        {(['a', 'b', 'c', 'd', 'e', 'f', 'g'] as const).map((seg) => (
          <div
            key={seg}
            className="absolute rounded-sm transition-colors"
            style={{
              ...SEG_STYLE[seg],
              backgroundColor: segColor((inputs[seg] ?? 0) === 1),
              border: `1px solid ${SEG_BORDER}`,
              boxShadow: (inputs[seg] ?? 0) === 1 ? '0 0 6px #ef4444' : 'none',
            }}
          />
        ))}
        {/* Десятичная точка справа снизу. */}
        <div
          className="absolute rounded-full transition-colors"
          style={{
            bottom: '4%',
            right: '2%',
            width: '12%',
            height: '12%',
            backgroundColor: segColor((inputs.dp ?? 0) === 1),
            border: `1px solid ${SEG_BORDER}`,
            boxShadow: (inputs.dp ?? 0) === 1 ? '0 0 6px #ef4444' : 'none',
          }}
        />
      </div>

      {/* Подпись. */}
      <div className="mt-1 text-center text-[10px] font-semibold text-slate-300">
        SEG7{component.label ? ` ${component.label}` : ''}
      </div>
    </div>
  );
}
