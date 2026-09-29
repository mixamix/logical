// ============================================================================
// Общие константы и типы для кастомных узлов React Flow.
// ============================================================================

import type { ComponentType } from '@logic/shared';

/** Размеры узлов (px). */
export const NODE_WIDTH = 90;
export const NODE_HEIGHT = 60;
export const SWITCH_WIDTH = 80;
export const SWITCH_HEIGHT = 60;
export const LED_WIDTH = 70;
export const LED_HEIGHT = 60;

/** Смещение пина от центра узла (для ручного позиционирования handle). */
export const PIN_OFFSET = 28;

/**
 * Человекочитаемые названия вентилей для отображения внутри узла.
 */
export const GATE_SYMBOLS: Record<ComponentType, string> = {
  SWITCH: 'SW',
  LED: 'LED',
  NOT: 'NOT',
  AND: 'AND',
  OR: 'OR',
  XOR: 'XOR',
  NAND: 'NAND',
  NOR: 'NOR',
};

/**
 * Цвета подсветки. Используются и для узлов, и для проводов.
 */
export const COLORS = {
  /** Активный сигнал (логическая 1). */
  signalOn: '#22c55e',
  /** Пассивный сигнал (логический 0). */
  signalOff: '#94a3b8',
  /** Подсветка от AI. */
  highlight: '#f59e0b',
  /** Фон узла. */
  nodeBg: '#ffffff',
  /** Граница узла. */
  nodeBorder: '#cbd5e1',
} as const;
