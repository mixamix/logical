// ============================================================================
// Общие константы и типы для кастомных узлов React Flow.
// ============================================================================

import type { ComponentType } from '@logic/shared';

/** Размеры узлов (px). */
export const NODE_WIDTH = 90;

/** Размер клетки сетки и шаг привязки узлов (px). */
export const GRID_SIZE = 20;
export const NODE_HEIGHT = 60;
export const SWITCH_WIDTH = 80;
export const SWITCH_HEIGHT = 60;
export const LED_WIDTH = 70;
export const LED_HEIGHT = 60;

/** Смещение пина от центра узла (для ручного позиционирования handle). */
export const PIN_OFFSET = 28;

/**
 * Человекочитаемые названия элементов для отображения внутри узла.
 * Короткие символы для вентилей, аббревиатуры для микросхем.
 */
export const GATE_SYMBOLS: Record<ComponentType, string> = {
  // --- Базовые ---
  SWITCH: 'SW',
  LED: 'LED',
  NOT: 'NOT',
  AND: 'AND',
  OR: 'OR',
  XOR: 'XOR',
  NAND: 'NAND',
  NOR: 'NOR',

  // --- Расширенные вентили ---
  BUFFER: 'BUF',
  XNOR: 'XNOR',
  AND3: 'AND3',
  OR3: 'OR3',
  NAND3: 'NAND3',
  NOR3: 'NOR3',

  // --- Комбинационные микросхемы ---
  HALF_ADDER: 'HADD',
  FULL_ADDER: 'FADD',
  MUX2: 'MUX2',
  MUX4: 'MUX4',
  DEMUX2: 'DMX2',
  DECODER2: 'DEC2',
  ENCODER4: 'ENC4',
  COMPARATOR: 'CMP',

  // --- Последовательностные элементы ---
  RS_LATCH: 'RS',
  D_TRIGGER: 'D-FF',
  JK_TRIGGER: 'JK',
  T_TRIGGER: 'T-FF',
  REGISTER4: 'REG4',
  COUNTER4: 'CNT4',
  SHIFT_REG4: 'SHR4',

  // --- Микропроцессорные блоки ---
  ALU4: 'ALU4',
  ROM8x8: 'ROM',
  RAM8x8: 'RAM',
  CPU4: 'CPU4',
};

/**
 * Мнемонические обозначения вентилей по ГОСТ 2.743 / МЭК 60617.
 * Это классические символы на прямоугольнике:
 *   &   — И (AND)
 *   ≥1  — ИЛИ (OR)
 *   =1  — Исключающее ИЛИ (XOR)
 *   1   — НЕ (NOT), повторитель (BUFFER)
 *   &̄   — И-НЕ (NAND, штрих над &)
 *   ≥1̄  — ИЛИ-НЕ (NOR)
 *   =1̄  — Исключающее ИЛИ-НЕ (XNOR)
 * Для микросхем (сумматоры, MUX, триггеры и т.д.) оставляем текстовую аббревиатуру.
 */
export const GATE_MNEMONICS: Record<ComponentType, string> = {
  // Базовые вентили — ГОСТ-символы.
  NOT: '1',
  AND: '&',
  OR: '≥1',
  XOR: '=1',
  NAND: '&',
  NOR: '≥1',
  BUFFER: '1',
  XNOR: '=1',
  // Трёхвходовые — те же символы (число входов видно по пинам).
  AND3: '&',
  OR3: '≥1',
  NAND3: '&',
  NOR3: '≥1',
  // Ввод/вывод.
  SWITCH: 'SW',
  LED: 'LED',
  // Сложные микросхемы — оставляем аббревиатуры.
  HALF_ADDER: 'HADD',
  FULL_ADDER: 'FADD',
  MUX2: 'MUX2',
  MUX4: 'MUX4',
  DEMUX2: 'DMX2',
  DECODER2: 'DEC2',
  ENCODER4: 'ENC4',
  COMPARATOR: 'CMP',
  RS_LATCH: 'RS',
  D_TRIGGER: 'D-FF',
  JK_TRIGGER: 'JK',
  T_TRIGGER: 'T-FF',
  REGISTER4: 'REG4',
  COUNTER4: 'CNT4',
  SHIFT_REG4: 'SHR4',
  ALU4: 'ALU4',
  ROM8x8: 'ROM',
  RAM8x8: 'RAM',
  CPU4: 'CPU4',
  // Устройства отображения.
  SEG7: '8.',
  LCD1602: 'LCD',
};

/** Инверсия (штрих) для NAND/NOR/XNOR — рисуем черту над символом. */
export const INVERTED_GATES = new Set<ComponentType>(['NAND', 'NOR', 'XNOR', 'NAND3', 'NOR3']);

/**
 * Полные русские названия типов — расшифровка для палитры и подсказок.
 */
export const GATE_LABELS_RU: Record<ComponentType, string> = {
  SWITCH: 'Переключатель',
  LED: 'Светодиод',
  NOT: 'НЕ',
  AND: 'И',
  OR: 'ИЛИ',
  XOR: 'Исключающее ИЛИ',
  NAND: 'И-НЕ',
  NOR: 'ИЛИ-НЕ',
  BUFFER: 'Повторитель',
  XNOR: 'Исключающее ИЛИ-НЕ',
  AND3: 'И (3 входа)',
  OR3: 'ИЛИ (3 входа)',
  NAND3: 'И-НЕ (3 входа)',
  NOR3: 'ИЛИ-НЕ (3 входа)',
  HALF_ADDER: 'Полусумматор',
  FULL_ADDER: 'Полный сумматор',
  MUX2: 'Мультиплексор 2:1',
  MUX4: 'Мультиплексор 4:1',
  DEMUX2: 'Демультиплексор 1:2',
  DECODER2: 'Дешифратор 2:4',
  ENCODER4: 'Шифратор 4:2',
  COMPARATOR: 'Компаратор',
  RS_LATCH: 'RS-триггер',
  D_TRIGGER: 'D-триггер',
  JK_TRIGGER: 'JK-триггер',
  T_TRIGGER: 'T-триггер',
  REGISTER4: 'Регистр 4 бит',
  COUNTER4: 'Счётчик 4 бит',
  SHIFT_REG4: 'Сдвиговый регистр 4 бит',
  ALU4: 'АЛУ 4 бит',
  ROM8x8: 'ПЗУ 8×8',
  RAM8x8: 'ОЗУ 8×8',
  CPU4: 'Процессор 4 бит',
  SEG7: '7-сегментный индикатор',
  LCD1602: 'ЖК-дисплей 1602',
};

/**
 * Цвета подсветки. Используются и для узлов, и для проводов.
 */
export const IC_MIN_WIDTH = 110;

/** Высота одного пина при вертикальной раскладке в ICNode. */
export const IC_PIN_STEP = 18;

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
