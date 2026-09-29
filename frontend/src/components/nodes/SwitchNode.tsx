// ============================================================================
// Узел SWITCH: переключатель входа схемы.
//  - выход out (справа);
//  - тумблер внутри узла переключает состояние 0 <-> 1.
// ============================================================================

import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { CircuitNodeData } from './types.js';
import { COLORS, SWITCH_WIDTH } from './constants.js';

// React Flow v12: NodeProps<T> где T — форма data.
type Props = NodeProps & { data: CircuitNodeData };

export function SwitchNode({ id, data }: Props) {
  const { component, output, highlighted } = data;
  const isOn = output === 1;

  return (
    <div
      className="relative flex items-center justify-between rounded-lg border-2 bg-white px-2 shadow-sm transition-colors"
      style={{
        width: SWITCH_WIDTH,
        height: 60,
        borderColor: highlighted ? COLORS.highlight : isOn ? COLORS.signalOn : COLORS.nodeBorder,
      }}
    >
      {/* Подпись SWITCH */}
      <div className="flex flex-col">
        <span className="text-[10px] font-semibold text-slate-500">SWITCH</span>
        {component.label && (
          <span className="text-sm font-bold text-slate-800">{component.label}</span>
        )}
      </div>

      {/* Тумблер: клик переключает, nodrag предотвращает drag при клике. */}
      <button
        type="button"
        className="nodrag nopan flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors"
        style={{
          borderColor: isOn ? COLORS.signalOn : COLORS.nodeBorder,
          backgroundColor: isOn ? COLORS.signalOn : '#f1f5f9',
          color: isOn ? '#ffffff' : '#475569',
        }}
        onClick={(e) => {
          e.stopPropagation();
          data.component && (data as CircuitNodeData);
          // Колбэк приходит через data.onToggle — прокидывается в CircuitCanvas.
          (data as unknown as { onToggle?: (id: string) => void }).onToggle?.(id);
        }}
        title={isOn ? 'Выключить (1)' : 'Включить (0)'}
      >
        {isOn ? '1' : '0'}
      </button>

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
