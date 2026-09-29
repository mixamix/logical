// ============================================================================
// Одно сообщение в чате.
//  - user: справа, серый фон;
//  - assistant: слева, синий фон (подсказки и объяснения).
// ============================================================================

import type { ChatMessage as ChatMessageType } from '@logic/shared';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2 text-sm shadow-sm ${
          isUser
            ? 'rounded-br-sm bg-slate-200 text-slate-800'
            : 'rounded-bl-sm bg-blue-600 text-white'
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}
