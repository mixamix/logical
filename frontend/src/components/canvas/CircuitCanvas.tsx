// ============================================================================
// Canvas логической схемы на React Flow v12 (@xyflow/react).
//  - рендерит узлы и провода из контракта Circuit;
//  - разрешает перетаскивание узлов;
//  - пробрасывает клик по SWITCH наверх через onToggleSwitch;
//  - применяет подсветку от AI.
// ============================================================================

import { useMemo, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type NodeTypes,
  type OnNodeDrag,
  type Node,
} from '@xyflow/react';
import type { Bit, Circuit } from '@logic/shared';
import { CircuitNodeView } from '../nodes/CircuitNodeView.js';
import { circuitToNodes, wiresToEdges } from './mapping.js';
import type { SignalMap } from '../../simulator/index.js';

/** Стабильная карта типов узлов (создаётся один раз на уровне модуля). */
const nodeTypes: NodeTypes = {
  circuit: CircuitNodeView,
};

interface CircuitCanvasProps {
  /** Схема для отображения. */
  circuit: Circuit;
  /** Значения на всех пинах схемы. */
  signals?: SignalMap;
  /** Значение на выходе каждого компонента. */
  outputs?: Record<string, Bit>;
  /** id компонентов/проводов для подсветки. */
  highlight?: string[];
  /** Колбэк переключения SWITCH. */
  onToggleSwitch: (id: string) => void;
  /** Колбэк изменения позиции узла (для сохранения). */
  onNodeMove?: (id: string, pos: [number, number]) => void;
}

export function CircuitCanvas({
  circuit,
  signals = {},
  outputs = {},
  highlight = [],
  onToggleSwitch,
  onNodeMove,
}: CircuitCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(
    circuitToNodes(circuit, signals, outputs, highlight),
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    wiresToEdges(circuit, signals, highlight),
  );

  // Пересоздаём узлы и рёбра при изменении схемы/сигналов/подсветки.
  // (React Flow инициализирует состояние один раз, поэтому синхронизируем вручную.)
  useEffect(() => {
    setNodes(circuitToNodes(circuit, signals, outputs, highlight));
  }, [circuit, signals, outputs, highlight, setNodes]);

  useEffect(() => {
    setEdges(wiresToEdges(circuit, signals, highlight));
  }, [circuit, signals, highlight, setEdges]);

  /** Прокидываем onToggle в data узлов (React Flow хранит data внутри узла). */
  const nodesWithCallback = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        data: { ...n.data, onToggle: onToggleSwitch },
      })),
    [nodes, onToggleSwitch],
  );

  /** Обработка остановки перетаскивания узла. */
  // React Flow v12: OnNodeDrag<NodeType> — совместимый тип для drag-событий.
  const handleNodeDragStop: OnNodeDrag<Node> = useCallback(
    (_event, node) => {
      onNodeMove?.(node.id, [node.position.x, node.position.y]);
    },
    [onNodeMove],
  );

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodesWithCallback}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={handleNodeDragStop}
        fitView
        proOptions={{ hideAttribution: false }}
        nodesConnectable={false}
        nodesDraggable
        elementsSelectable={false}
        minZoom={0.3}
        maxZoom={2}
      >
        <Background gap={50} size={1} color="#e2e8f0" />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable />
      </ReactFlow>
    </div>
  );
}
