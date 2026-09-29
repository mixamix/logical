// ============================================================================
// Панель чата с AI.
//
// На этом шаге панель самодостаточна: сама держит историю сообщений и
// сама ходит в /api/chat. Связка с canvas (применение схемы и подсветки)
// будет на Шаге 7 через колбэк onResponse.
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import type { ChatMessage as ChatMessageType, ChatResponse } from '@logic/shared';
import { sendChat, ChatApiError } from '../../api/index.js';
import { ChatMessage } from './ChatMessage.js';

interface ChatPanelProps {
  /** Колбэк с ответом AI — вызывается при каждом успешном ответе (Шаг 7). */
  onResponse?: (response: ChatResponse) => void;
  /** Внешняя история (опционально, если родитель захочет контролировать). */
  messages?: ChatMessageType[];
}

const HINTS = [
  'Собери полусумматор',
  'Что такое XOR?',
  'Собери RS-триггер',
];

export function ChatPanel({ onResponse, messages: externalMessages }: ChatPanelProps) {
  const [internalMessages, setInternalMessages] = useState<ChatMessageType[]>([]);
  const messages = externalMessages ?? internalMessages;

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);

  // Автопрокрутка к последнему сообщению.
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const pushMessage = (msg: ChatMessageType) => {
    if (externalMessages) return; // историю ведёт родитель
    setInternalMessages((prev) => [...prev, msg]);
  };

  async function handleSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessageType = { role: 'user', content: trimmed };
    pushMessage(userMsg);
    setInput('');
    setError(null);
    setLoading(true);

    try {
      const history = [...messages, userMsg];
      const response = await sendChat(history);
      pushMessage({ role: 'assistant', content: response.reply });
      onResponse?.(response);
    } catch (err) {
      const msg =
        err instanceof ChatApiError
          ? err.message
          : 'Неизвестная ошибка. Попробуйте ещё раз.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void handleSend(input);
  }

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Заголовок. */}
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-700">AI-помощник</h2>
        <p className="text-xs text-slate-400">
          Попросите собрать схему или объяснить логику
        </p>
      </div>

      {/* Список сообщений. */}
      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs text-slate-400">Попробуйте спросить:</p>
            <div className="flex flex-wrap gap-2">
              {HINTS.map((hint) => (
                <button
                  key={hint}
                  type="button"
                  onClick={() => void handleSend(hint)}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600 transition-colors hover:bg-slate-100"
                >
                  {hint}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <ChatMessage key={i} message={msg} />
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm bg-blue-600 px-4 py-2 text-sm text-white">
              <span className="inline-flex gap-1">
                <span className="animate-bounce">·</span>
                <span className="animate-bounce [animation-delay:0.1s]">·</span>
                <span className="animate-bounce [animation-delay:0.2s]">·</span>
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
            {error}
          </div>
        )}
      </div>

      {/* Поле ввода. */}
      <form onSubmit={handleSubmit} className="border-t border-slate-200 p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder="Спросите что-нибудь…"
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 disabled:bg-slate-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loading ? '…' : 'Отправить'}
          </button>
        </div>
      </form>
    </div>
  );
}
