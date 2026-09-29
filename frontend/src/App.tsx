// ============================================================================
// Корневой компонент. Шаг 5 — стор симуляции.
// Шаг 6 — панель чата. Шаг 7 — связка ответа AI с canvas.
// Шаг 8 — схема сохраняется в localStorage (см. store/persistence.ts),
// а над canvas есть кнопка сброса.
// ============================================================================

import type { ChatResponse } from '@logic/shared';
import { CircuitCanvas } from './components/canvas/index.js';
import { ChatPanel } from './components/chat/index.js';
import { useCircuitStore } from './store/index.js';

export default function App() {
  const circuit = useCircuitStore((s) => s.circuit);
  const signals = useCircuitStore((s) => s.signals);
  const outputs = useCircuitStore((s) => s.outputs);
  const highlight = useCircuitStore((s) => s.highlight);
  const setCircuit = useCircuitStore((s) => s.setCircuit);
  const toggleSwitch = useCircuitStore((s) => s.toggleSwitch);
  const setHighlight = useCircuitStore((s) => s.setHighlight);
  const reset = useCircuitStore((s) => s.reset);

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
    const current = useCircuitStore.getState().circuit;
    setCircuit({
      ...current,
      components: current.components.map((c) => (c.id === id ? { ...c, pos } : c)),
    });
  };

  return (
    <div className="flex h-screen w-screen bg-slate-50">
      {/* Canvas занимает основную часть экрана. */}
      <div className="relative flex-1">
        {/* Шаг 8: кнопка сброса схемы (очищает стор и localStorage). */}
        {circuit.components.length > 0 && (
          <button
            type="button"
            onClick={reset}
            className="absolute right-4 top-4 z-10 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
          >
            Сбросить схему
          </button>
        )}

        {circuit.components.length === 0 ? (
          <div className="flex h-full items-center justify-center text-slate-400">
            Схема пуста — попросите AI собрать схему
          </div>
        ) : (
          <CircuitCanvas
            circuit={circuit}
            signals={signals}
            outputs={outputs}
            highlight={highlight}
            onToggleSwitch={toggleSwitch}
            onNodeMove={handleNodeMove}
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
