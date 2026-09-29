// ============================================================================
// Canvas логической схемы на React Flow v12 (@xyflow/react).
//  - рендерит узлы и провода из контракта Circuit;
//  - разрешает перетаскивание узлов;
//  - пробрасывает клик по SWITCH наверх через onToggleSwitch;
//  - применяет подсветку от AI.
// ============================================================================

import { useMemo, useCallback, useEffect, useState } from 'react';
import { GRID_SIZE } from '../nodes/constants.js';
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
  type Connection,
  type Edge,
  type IsValidConnection,
} from '@xyflow/react';
import { useCircuitStore } from '../../store/index.js';
import type { Circuit } from '@logic/shared';
import { CircuitNodeView } from '../nodes/CircuitNodeView.js';
import { circuitToNodes, wiresToEdges } from './mapping.js';
import type { SignalMap } from '../../simulator/index.js';
import type { PinBits } from '../../simulator/gates.js';

/** Стабильная карта типов узлов (создаётся один раз на уровне модуля). */
const nodeTypes: NodeTypes = {
  circuit: CircuitNodeView,
};

interface CircuitCanvasProps {
  /** Схема для отображения. */
  circuit: Circuit;
  /** Значения на всех пинах схемы. */
  signals?: SignalMap;
  /** Значения на всех выходах каждого компонента (id -> {pin -> Bit}). */
  outputs?: Record<string, PinBits>;
  /** id компонентов/проводов для подсветки. */
  highlight?: string[];
  /** Колбэк переключения SWITCH. */
  onToggleSwitch: (id: string) => void;
  /** Колбэк изменения позиции узла (для сохранения). */
  onNodeMove?: (id: string, pos: [number, number]) => void;
  /** Колбэк соединения двух пинов: (fromPin, toPin). */
  onConnectPins?: (from: string, to: string) => void;
  /** Колбэк разрыва провода: (fromPin, toPin). */
  onDisconnectPins?: (from: string, to: string) => void;
}

export function CircuitCanvas({
  circuit,
  signals = {},
  outputs = {},
  highlight = [],
  onToggleSwitch,
  onNodeMove,
  onConnectPins,
  onDisconnectPins,
}: CircuitCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(
    circuitToNodes(circuit, signals, outputs, highlight),
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    wiresToEdges(circuit, signals, highlight),
  );

  /** Пин, от которого сейчас тянется провод (для подсветки подходящих входов). */
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  /** Показывать ли сетку и привязку к ней. */
  const [gridEnabled, setGridEnabled] = useState(true);
  const canConnect = useCircuitStore((s) => s.canConnect);
  const removeComponent = useCircuitStore((s) => s.removeComponent);

  // Синхронизируем узлы при изменении схемы/сигналов/подсветки.
  // ВАЖНО: сохраняем флаг selected у существующих узлов и не трогаем
  // структуру массива, если состав компонентов не изменился — иначе
  // локальное удаление React Flow (onNodesChange) тут же откатывается.
  useEffect(() => {
    setNodes((prev) => {
      const next = circuitToNodes(circuit, signals, outputs, highlight);
      const prevSelected = new Set(prev.filter((n) => n.selected).map((n) => n.id));
      // Если состав узлов тот же — переносим только данные и позиции.
      const prevById = new Map(prev.map((n) => [n.id, n]));
      const sameSet =
        prev.length === next.length && next.every((n) => prevById.has(n.id));
      if (sameSet) {
        return prev.map((n) => {
          const fresh = next.find((m) => m.id === n.id);
          if (!fresh) return n;
          return { ...n, data: fresh.data, position: n.position };
        });
      }
      // Состав изменился — берём новые узлы, восстанавливая выделение.
      return next.map((n) => ({ ...n, selected: prevSelected.has(n.id) }));
    });
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

  /** Пользователь протянул провод между двумя пинами. */
  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.sourceHandle || !connection.targetHandle) return;
      const from = `${connection.source}.${connection.sourceHandle}`;
      const to = `${connection.target}.${connection.targetHandle}`;
      onConnectPins?.(from, to);
    },
    [onConnectPins],
  );

  /** Пользователь удалил провод (выделил и нажал Delete/Backspace). */
  const handleEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      for (const edge of deleted) {
        const from = `${edge.source}.${edge.sourceHandle}`;
        const to = `${edge.target}.${edge.targetHandle}`;
        onDisconnectPins?.(from, to);
      }
    },
    [onDisconnectPins],
  );

  /** Пользователь удалил узлы (выделил и нажал Delete/Backspace). */
  const handleNodesDelete = useCallback(
    (deleted: Node[]) => {
      for (const node of deleted) {
        removeComponent(node.id);
      }
    },
    [removeComponent],
  );

  /** Начали тянуть провод от пина — запоминаем источник для подсветки. */
  const handleConnectStart = useCallback(
    (_e: unknown, params: { nodeId: string | null; handleId: string | null }) => {
      if (params.nodeId && params.handleId) {
        setConnectingFrom(`${params.nodeId}.${params.handleId}`);
      }
    },
    [],
  );

  /** Завершили протягивание (успешно или нет) — сбрасываем подсветку. */
  const handleConnectEnd = useCallback(() => {
    setConnectingFrom(null);
  }, []);

  /**
   * Проверка допустимости соединения. React Flow подсвечивает невалидные
   * цели красным, валидные — зелёным. Используем правила из стора.
   */
  const isValidConnection: IsValidConnection = useCallback(
    (connection) => {
      if (!connection.sourceHandle || !connection.targetHandle) return false;
      const from = `${connection.source}.${connection.sourceHandle}`;
      const to = `${connection.target}.${connection.targetHandle}`;
      return canConnect(from, to);
    },
    [canConnect],
  );

  return (
    <div className="h-full w-full">
      {/* Кнопка вкл/выкл сетки и привязки к ней. */}
      <div className="absolute bottom-4 left-4 z-10">
        <button
          type="button"
          onClick={() => setGridEnabled((v) => !v)}
          className={`rounded-lg border px-3 py-1.5 text-xs font-medium shadow-sm transition-colors ${
            gridEnabled
              ? 'border-blue-300 bg-blue-50 text-blue-700'
              : 'border-slate-200 bg-white text-slate-600'
          }`}
          title={gridEnabled ? 'Отключить сетку и привязку' : 'Включить сетку и привязку'}
        >
          {gridEnabled ? '⊞ Сетка: вкл' : '⊞ Сетка: выкл'}
        </button>
      </div>

      <ReactFlow
        nodes={nodesWithCallback}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={handleNodeDragStop}
        onConnect={handleConnect}
        onEdgesDelete={handleEdgesDelete}
        onNodesDelete={handleNodesDelete}
        onConnectStart={handleConnectStart}
        onConnectEnd={handleConnectEnd}
        isValidConnection={isValidConnection}
        fitView
        proOptions={{ hideAttribution: false }}
        nodesConnectable
        nodesDraggable
        elementsSelectable
        edgesFocusable
        nodesFocusable
        deleteKeyCode={['Delete', 'Backspace']}
        snapToGrid={gridEnabled}
        snapGrid={[GRID_SIZE, GRID_SIZE]}
        minZoom={0.3}
        maxZoom={2}
        className={connectingFrom ? 'connecting-mode' : ''}
      >
        {gridEnabled && <Background gap={GRID_SIZE} size={1} color="#e2e8f0" />}
        {!gridEnabled && <Background gap={50} size={1} color="#e2e8f0" />}
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable />
      </ReactFlow>
    </div>
  );
}
