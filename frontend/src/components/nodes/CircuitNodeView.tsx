// ============================================================================
// Диспетчер узла: выбирает конкретный визуальный компонент по component.type.
// React Flow видит один тип узла 'circuit', а внутри рендерится Switch/Led/Gate.
// ============================================================================

import type { NodeProps } from '@xyflow/react';
import type { CircuitNodeData } from './types.js';
import { SwitchNode } from './SwitchNode.js';
import { LedNode } from './LedNode.js';
import { GateNode } from './GateNode.js';

type Props = NodeProps & { data: CircuitNodeData };

export function CircuitNodeView(props: Props) {
  const type = props.data.component.type;

  switch (type) {
    case 'SWITCH':
      return <SwitchNode {...props} />;
    case 'LED':
      return <LedNode {...props} />;
    default:
      // NOT, AND, OR, XOR, NAND, NOR
      return <GateNode {...props} />;
  }
}
