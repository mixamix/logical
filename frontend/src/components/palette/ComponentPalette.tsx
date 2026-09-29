// ============================================================================
// Палитра компонентов (Шаг 13.1b): позволяет вручную добавлять ЛЮБОЙ из 33
// типов элементов на canvas, не полагаясь на AI.
//
// Типы сгруппированы по категориям. Клик по кнопке вызывает addComponent(type)
// в сторе — компонент появляется в свободной позиции и сразу пересчитывается.
// ============================================================================

import { useState } from 'react';
import type { ComponentType } from '@logic/shared';
import { useCircuitStore } from '../../store/index.js';
import { GATE_MNEMONICS, GATE_LABELS_RU, INVERTED_GATES } from '../nodes/constants.js';

interface Category {
  title: string;
  types: ComponentType[];
}

/** Все 33 типа, сгруппированные по назначению. */
const CATEGORIES: Category[] = [
  {
    title: 'Ввод / вывод',
    types: ['SWITCH', 'LED'],
  },
  {
    title: 'Базовые вентили',
    types: ['NOT', 'AND', 'OR', 'XOR', 'NAND', 'NOR'],
  },
  {
    title: 'Расширенные вентили',
    types: ['BUFFER', 'XNOR', 'AND3', 'OR3', 'NAND3', 'NOR3'],
  },
  {
    title: 'Комбинационные',
    types: ['HALF_ADDER', 'FULL_ADDER', 'MUX2', 'MUX4', 'DEMUX2', 'DECODER2', 'ENCODER4', 'COMPARATOR'],
  },
  {
    title: 'Последовательностные',
    types: ['RS_LATCH', 'D_TRIGGER', 'JK_TRIGGER', 'T_TRIGGER', 'REGISTER4', 'COUNTER4', 'SHIFT_REG4'],
  },
  {
    title: 'Микропроцессор',
    types: ['ALU4', 'ROM8x8', 'RAM8x8', 'CPU4'],
  },
  {
    title: 'Отображение',
    types: ['SEG7', 'LCD1602'],
  },
];

export function ComponentPalette() {
  const addComponent = useCircuitStore((s) => s.addComponent);
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <div className="absolute left-4 top-4 z-10">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-100"
          title="Показать палитру компонентов"
        >
          + Компоненты
        </button>
      </div>
    );
  }

  return (
    <div className="absolute left-4 top-4 z-10 max-h-[calc(100vh-2rem)] w-56 overflow-y-auto rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Компоненты
        </h2>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="rounded px-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          title="Свернуть"
        >
          ×
        </button>
      </div>

      {CATEGORIES.map((cat) => (
        <div key={cat.title} className="mb-3">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            {cat.title}
          </div>
          <div className="grid grid-cols-2 gap-1">
            {cat.types.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => addComponent(type)}
                className="flex flex-col items-center rounded-md border border-slate-200 bg-slate-50 px-1 py-1 transition-colors hover:border-blue-300 hover:bg-blue-50"
                title={`${GATE_LABELS_RU[type]} (${type})`}
              >
                <span className="text-sm font-bold leading-tight text-slate-800">
                  {GATE_MNEMONICS[type]}
                  {INVERTED_GATES.has(type) && (
                    <span className="ml-0.5 align-super text-[9px] text-slate-500">▔</span>
                  )}
                </span>
                <span className="text-[9px] leading-tight text-slate-500">
                  {GATE_LABELS_RU[type]}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}

      <p className="mt-1 text-[10px] leading-tight text-slate-400">
        Клик — добавить на схему. Потяните узел, чтобы переместить.
      </p>
    </div>
  );
}
