// ============================================================================
// Персистентность схемы в localStorage.
//
// Отдельный модуль, чтобы стор не знал деталей хранилища, а чтение из
// localStorage было защищено Zod-валидацией (битые/старые данные не сломают UI).
// ============================================================================

import { circuitSchema, type Circuit } from '@logic/shared';

/** Ключ, под которым схема лежит в localStorage. */
export const STORAGE_KEY = 'logic-simulator:circuit';

/**
 * Читает схему из localStorage.
 * Возвращает null, если данных нет, они битые или не проходят валидацию.
 * Никогда не бросает исключение — при любой проблеме просто возвращает null.
 */
export function loadCircuit(): Circuit | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    const result = circuitSchema.safeParse(parsed);
    if (!result.success) {
      // Данные повреждены или устарели — чистим, чтобы не мешали.
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return result.data;
  } catch {
    return null;
  }
}

/** Сохраняет схему в localStorage. При ошибке записи молча игнорирует. */
export function saveCircuit(circuit: Circuit): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(circuit));
  } catch {
    // Например, переполнение квоты или приватный режим — не критично.
  }
}

/** Удаляет сохранённую схему. */
export function clearCircuit(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
