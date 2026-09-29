// ============================================================================
// Сборка кастомных узлов React Flow.
// Единая карта nodeTypes: тип компонента → React-компонент узла.
// ============================================================================

import { SwitchNode } from './SwitchNode.js';
import { LedNode } from './LedNode.js';
import { GateNode } from './GateNode.js';
import { CircuitNodeView } from './CircuitNodeView.js';

/**
 * React Flow требует стабильную ссылку на nodeTypes (не пересоздавать на каждый рендер).
 * Мы используем один тип узла 'circuit' и внутри него рендерим нужный компонент по component.type.
 * Это упрощает маппинг, но требует диспетчеризации внутри CircuitNodeView.
 */
export { SwitchNode, LedNode, GateNode, CircuitNodeView };
