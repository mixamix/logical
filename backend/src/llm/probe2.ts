// ============================================================================
// Отладочный прогон LLM-клиента напрямую (без HTTP-сервера).
// Запуск: node --import tsx ./backend/src/llm/probe2.ts
// Пишет результат в probe-out.txt, чтобы обойти проблемы с захватом stdout.
// ============================================================================

import { writeFileSync } from 'node:fs';
import { askLlm } from './client.js';
import { LlmError } from './errors.js';

async function main(): Promise<void> {
  const lines: string[] = [];
  try {
    const result = await askLlm([{ role: 'user', content: 'Собери полусумматор' }]);
    lines.push('OK');
    lines.push('reply: ' + result.reply);
    lines.push('types: ' + (result.circuit?.components.map((c) => c.type).join(', ') ?? '—'));
    lines.push('components: ' + JSON.stringify(result.circuit?.components ?? null));
    lines.push('wires: ' + JSON.stringify(result.circuit?.wires ?? null));
  } catch (err) {
    if (err instanceof LlmError) {
      lines.push('LLM_ERROR status=' + err.status + ' message=' + err.message);
    } else if (err instanceof Error) {
      lines.push('ERROR name=' + err.name + ' message=' + err.message);
      lines.push(err.stack ?? '');
    } else {
      lines.push('UNKNOWN ' + String(err));
    }
  }
  writeFileSync('d:\\prj\\logic\\probe-out.txt', lines.join('\n'), 'utf8');
}

void main();
