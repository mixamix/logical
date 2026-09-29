// ============================================================================
// Узел ЖК-дисплея 1602 (2 строки × 16 символов).
//  - входы слева: rs (выбор регистра), e (строб), d0..d7 (шина данных);
//  - отображает 2 строки по 16 знакомест с зелёной подсветкой;
//  - символы выводятся в виде знакомест (символьная матрица упрощена).
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
  const start = 10;
  const end = 90;
  const step = total > 1 ? (end - start) / (total - 1) : 0;
  return `${start + step * index}%`;
}

/** Все входные пины LCD1602. */
const INPUT_PINS = ['rs', 'e', 'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7'] as const;

/** Ширина знакоместа и всей строки (в знакоместах). */
const COLS = 16;

export function LcdNode({ data }: Props) {
  const { component, inputs, highlighted } = data;

  // Активен ли дисплей: включён строб E или есть данные на шине.
  const busValue = INPUT_PINS
    .filter((p) => p.startsWith('d'))
    .reduce((acc, p, i) => acc | ((inputs[p] ?? 0) << i), 0);
  const active = (inputs.e ?? 0) === 1 || busValue !== 0;

  // Упрощённая эмуляция: на экран выводим данные шины как символ,
  // повторяя его по строке (реальное управление требует последовательности).
  const ch = busValue ? String.fromCharCode(32 + (busValue % 95)) : ' ';
  const line1 = active ? ch.repeat(COLS) : ' '.repeat(COLS);
  const line2 = ' '.repeat(COLS);

  return (
    <div
      className="relative rounded-lg border-2 bg-slate-800 p-2 shadow-sm transition-colors"
      style={{
        width: 220,
        height: 150,
        borderColor: highlighted ? COLORS.highlight : active ? '#22c55e' : COLORS.nodeBorder,
      }}
    >
      {/* Входы слева. */}
      {INPUT_PINS.map((pin, i) => (
        <div key={pin}>
          <Handle
            id={pin}
            type="target"
            position={Position.Left}
            style={{
              top: pinTop(i, INPUT_PINS.length),
              background: pinColor(inputs[pin]),
              width: 8,
              height: 8,
            }}
          />
          <span
            className="pointer-events-none absolute text-[9px] font-medium text-slate-300"
            style={{ top: `calc(${pinTop(i, INPUT_PINS.length)} - 6px)`, left: -18 }}
          >
            {pin}
          </span>
        </div>
      ))}

      {/* Экран: 2 строки × 16 символов, зелёная подсветка. */}
      <div className="mx-auto mt-1 rounded bg-green-900 p-1 font-mono">
        <div className="flex h-7 items-center rounded-sm bg-green-500/20 px-1 text-[11px] leading-none tracking-widest text-green-300">
          {line1}
        </div>
        <div className="mt-1 flex h-7 items-center rounded-sm bg-green-500/20 px-1 text-[11px] leading-none tracking-widest text-green-300">
          {line2}
        </div>
      </div>

      {/* Подпись. */}
      <div className="mt-1 text-center text-[10px] font-semibold text-slate-300">
        LCD1602{component.label ? ` ${component.label}` : ''}
      </div>
    </div>
  );
}
