// ============================================================================
// Отладочный прогон LLM-клиента напрямую (без HTTP-сервера).
// Запуск: node --import tsx ./backend/src/llm/probe.ts
// Показывает реальную ошибку вместо обобщённой 500.
// ============================================================================

import { askLlm } from './client.js';
import { LlmError } from './errors.js';

async function main(): Promise<void> {
  try {
    const result = await askLlm([{ role: 'user', content: 'Собери полусумматор' }]);
    console.log('OK');
    console.log('reply:', result.reply);
    console.log('components:', result.circuit?.components.map((c) => c.type).join(', ') ?? '—');
  } catch (err) {
    if (err instanceof LlmError) {
      console.error(`LLM_ERROR status=${err.status} message=${err.message}`);
    } else if (err instanceof Error) {
      console.error(`ERROR name=${err.name} message=${err.message}`);
      console.error(err.stack);
    } else {
      console.error('UNKNOWN', err);
    }
    process.exitCode = 1;
  }
}

void main();
