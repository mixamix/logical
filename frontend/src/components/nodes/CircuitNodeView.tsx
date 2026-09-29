// ============================================================================
// Диспетчер узла: выбирает конкретный визуальный компонент по component.type.
// React Flow видит один тип узла 'circuit', а внутри рендерится Switch/Led/Gate.
// ============================================================================

import type { NodeProps } from '@xyflow/react';
import type { ComponentType } from '@logic/shared';
import type { CircuitNodeData } from './types.js';
import { SwitchNode } from './SwitchNode.js';
import { LedNode } from './LedNode.js';
import { GateNode } from './GateNode.js';
import { ICNode } from './ICNode.js';
import { Seg7Node } from './Seg7Node.js';
import { LcdNode } from './LcdNode.js';

type Props = NodeProps & { data: CircuitNodeData };

/**
 * Вентили, которые рисует GateNode (у них фиксированные входы a/b и выход out).
 * Всё, что не входит в этот набор и не SWITCH/LED, рисует универсальный ICNode.
 */
const GATE_NODE_TYPES = new Set<ComponentType>([
  'NOT',
  'AND',
  'OR',
  'XOR',
  'NAND',
  'NOR',
  'BUFFER',
  'XNOR',
]);

export function CircuitNodeView(props: Props) {
  const type = props.data.component.type;

  switch (type) {
    case 'SWITCH':
      return <SwitchNode {...props} />;
    case 'LED':
      return <LedNode {...props} />;
    case 'SEG7':
      return <Seg7Node {...props} />;
    case 'LCD1602':
      return <LcdNode {...props} />;
    default:
      // Простые вентили — GateNode; всё остальное — универсальный ICNode.
      return GATE_NODE_TYPES.has(type) ? <GateNode {...props} /> : <ICNode {...props} />;
  }
}
