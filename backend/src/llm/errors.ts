// ============================================================================
// Ошибка LLM-слоя с HTTP-статусом.
// Позволяет пробрасывать осмысленные коды ответа до Express-роутера.
// ============================================================================

export class LlmError extends Error {
  /** HTTP-статус, который вернём клиенту. */
  public readonly status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = 'LlmError';
    this.status = status;
  }
}
