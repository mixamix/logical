// ============================================================================
// Типы данных, которые React Flow хранит в узлах и рёбрах.
// Расширяем базовые Node/Edge полями нашего контракта.
//
// Шаг 13: компонент теперь может иметь МНОГО выходов (out, q, nq, s, c ...),
// поэтому вместо одного `output: Bit` узел несёт карту всех выходных пинов
// `outputs: Record<string, Bit>`. Поле `output` оставлено как «главный» выход
// (для одно-выходных элементов это out, для LED/SWITCH — их единственный пин),
// чтобы не переписывать простые визуальные компоненты.
// ============================================================================

import type { Node, Edge } from '@xyflow/react';
import type { Component, ComponentType, Bit } from '@logic/shared';


/** Данные, которые несёт каждый узел схемы. */
export type CircuitNodeData = {
  /** Исходное описание компонента (id, type, label, pos). */
  component: Component;
  /**
   * «Главный» выход компонента для быстрого отображения (0 или 1).
   * Для однодвыходных — единственный выход; для много-выходных — первый
   * в списке COMPONENT_PINS[type].outputs (например, q у триггеров).
   */
  output: Bit;
  /** Все выходные значения компонента: pin -> 0/1. */
  outputs: Record<string, Bit>;
  /** Значения на входах — для отображения состояния. */
  inputs: Record<string, Bit>;
  /** Подсвечен ли узел AI. */
  highlighted: boolean;
};

/**
 * Узел React Flow с нашими данными.
 * name union (`'circuit'`) нужен, чтобы TS различал типы узлов.
 */
export type CircuitNode = Node<CircuitNodeData, 'circuit'>;

/** Данные ребра (провода): несёт текущее значение сигнала. */
export type CircuitEdgeData = {
  /** Логическое значение сигнала на проводе. */
  signal: Bit;
  /** Подсвечен ли провод AI. */
  highlighted: boolean;
};

/** Ребро React Flow с нашими данными. */
export type CircuitEdge = Edge<CircuitEdgeData>;

/** Пропсы, общие для всех кастомных узлов. */
export type CircuitNodeProps = {
  /** id компонента (совпадает с Node.id). */
  id: string;
  /** Исходное описание компонента. */
  component: Component;
  /** «Главный» выход (см. CircuitNodeData.output). */
  output: Bit;
  /** Все выходы компонента: pin -> 0/1. */
  outputs: Record<string, Bit>;
  /** Текущие входы. */
  inputs: Record<string, Bit>;
  /** Подсветка. */
  highlighted: boolean;
  /** Колбэк переключения SWITCH (только для SWITCH). */
  onToggle?: (id: string) => void;
};

/** Сигнатура для маппинга тип компонента → компонент узла. */
export type NodeComponentMap = Record<ComponentType, React.ComponentType<CircuitNodeProps>>;
