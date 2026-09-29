// ============================================================================
// Корневой компонент. Шаг 5 — стор симуляции.
// Шаг 6 — панель чата. Шаг 7 — связка ответа AI с canvas.
// Шаг 8 — схема сохраняется в localStorage (см. store/persistence.ts),
// а над canvas есть кнопка сброса.
// ============================================================================

import type { ChatResponse } from '@logic/shared';
import { CircuitCanvas } from './components/canvas/index.js';
import { ChatPanel } from './components/chat/index.js';
import { ComponentPalette } from './components/palette/index.js';
import { useCircuitStore } from './store/index.js';

export default function App() {
  const circuit = useCircuitStore((s) => s.circuit);
  const signals = useCircuitStore((s) => s.signals);
  const outputs = useCircuitStore((s) => s.outputs);
  const highlight = useCircuitStore((s) => s.highlight);
  const setCircuit = useCircuitStore((s) => s.setCircuit);
  const toggleSwitch = useCircuitStore((s) => s.toggleSwitch);
  const tick = useCircuitStore((s) => s.tick);
  const setHighlight = useCircuitStore((s) => s.setHighlight);
  const reset = useCircuitStore((s) => s.reset);
  const updateNodePosition = useCircuitStore((s) => s.updateNodePosition);
  const addWire = useCircuitStore((s) => s.addWire);
  const removeWire = useCircuitStore((s) => s.removeWire);

  /**
   * Шаг 7: реакция на ответ AI.
   * - есть circuit → заменяем схему (store сам сбросит SWITCH и пересчитает сигналы);
   * - есть highlight → подсвечиваем указанные компоненты;
   * - нет circuit (обычный вопрос) → canvas не трогаем, подсветку сбрасываем.
   */
  const handleChatResponse = (response: ChatResponse) => {
    if (response.circuit) {
      setCircuit(response.circuit);
      setHighlight(response.highlight ?? []);
    } else {
      setHighlight([]);
    }
  };

  const handleNodeMove = (id: string, pos: [number, number]) => {
    updateNodePosition(id, pos);
  };

  return (
    <div className="flex h-screen w-screen bg-slate-50">
      {/* Canvas занимает основную часть экрана. */}
      <div className="relative flex-1">
        {/* Шаг 13.1b: палитра компонентов (ручное добавление любых типов). */}
        <ComponentPalette />

        {/* Шаг 13.1b: панель управления над canvas — ТАКТ и сброс. */}
        {circuit.components.length > 0 && (
          <div className="absolute right-4 top-4 z-10 flex gap-2">
            {/* Глобальный такт: генерирует фронт CLK для всех тактируемых элементов. */}
            <button
              type="button"
              onClick={tick}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-100"
              title="Подать тактовый импульс (CLK 0→1→0)"
            >
              ТАКТ
            </button>
            {/* Шаг 8: кнопка сброса схемы (очищает стор и localStorage). */}
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
            >
              Сбросить схему
            </button>
          </div>
        )}

        {circuit.components.length === 0 ? (
          <div className="flex h-full items-center justify-center text-slate-400">
            Схема пуста — добавьте компонент из палитры слева или попросите AI
          </div>
        ) : (
          <CircuitCanvas
            circuit={circuit}
            signals={signals}
            outputs={outputs}
            highlight={highlight}
            onToggleSwitch={toggleSwitch}
            onNodeMove={handleNodeMove}
            onConnectPins={addWire}
            onDisconnectPins={removeWire}
          />
        )}
      </div>

      {/* Панель чата фиксированной ширины. */}
      <aside className="w-[360px] shrink-0 border-l border-slate-200">
        <ChatPanel onResponse={handleChatResponse} />
      </aside>
    </div>
  );
}
