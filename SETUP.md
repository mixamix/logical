# Установка и запуск проекта на другой машине

Пошаговая инструкция, чтобы развернуть **AI-симулятор логических схем** на чистом компьютере.

---

## 1. Что понадобится

| Компонент | Версия | Где взять |
|-----------|--------|-----------|
| **Node.js** | 18 или новее (рекомендую 20 LTS) | https://nodejs.org/ |
| **npm** | идёт вместе с Node.js | — |
| **Ollama** | последняя | https://ollama.com/download |
| **Git** | любая | https://git-scm.com/ (если клонируете репозиторий) |

> **Важно:** для локальной работы НЕ нужны API-ключи. Модель работает через Ollama на вашем компьютере.

---

## 2. Что переносить на другую машину

Скопируйте **всю папку проекта**, КРОМЕ служебных файлов:

### ❌ НЕ переносить (создаются заново)
- `node_modules/` (в корне и во всех workspace'ах)
- `dist/` (сборки)
- `backend/.env` (содержит локальные секреты)
- `*.log`, `.vite/`, `.cache/`

### ✅ Переносить обязательно
- `package.json` (корень)
- `package-lock.json` (корень)
- `shared/` (весь пакет)
- `backend/` (весь пакет, включая `.env.example`)
- `frontend/` (весь пакет)
- `scripts/` (все скрипты)
- `start.cmd`, `stop.cmd`, `check.cmd`, `verify.cmd`, `install.cmd`
- `SETUP.md` (этот файл)
- `.gitignore`

**Если используете Git:** просто `git clone` — но убедитесь, что `.gitignore` исключает `node_modules`, `dist`, `.env`.

---

## 3. Быстрый запуск (рекомендуется)

На новой машине откройте папку проекта и **дважды кликните** по этим файлам по порядку:

### Шаг 1. `install.cmd` — установка и сборка

Что делает:
1. проверяет Node.js (18+);
2. ставит зависимости (`npm install`);
3. собирает `shared`;
4. собирает `backend` и `frontend` (проверка типов);
5. создаёт `backend/.env` с настройками Ollama по умолчанию.

### Шаг 2. `check.cmd` — проверка окружения

Проверяет:
- Node.js/npm;
- установлены ли зависимости;
- собран ли `shared`;
- запущена ли Ollama и есть ли модель;
- есть ли `backend/.env`;
- свободны ли порты 3001 и 5173.

Каждая проблема сопровождается подсказкой, что делать.

### Шаг 3. `start.cmd` — запуск всех сервисов

Что делает:
1. проверяет Node.js;
2. при необходимости ставит зависимости;
3. собирает `shared`;
4. проверяет Ollama, при отсутствии модели — скачивает её;
5. создаёт `backend/.env`, если его нет;
6. запускает backend и frontend в отдельных окнах;
7. открывает браузер на http://localhost:5173.

### Шаг 4. `verify.cmd` — проверка работоспособности

Когда сервисы уже запущены, проверяет:
- backend отвечает на `/api/health`;
- frontend отдаёт HTML;
- chat реально отвечает (запрос к LLM);
- ответ LLM соответствует контракту (валидные типы компонентов).

### Шаг 5. `stop.cmd` — остановка

Освобождает порты 3001 и 5173. Ollama не трогает.

---

## 4. Ручной запуск (если скрипты не подходят)

```powershell
# 1. Установка зависимостей (из корня проекта)
npm install

# 2. Сборка общего пакета (обязательно!)
npm run build:shared

# 3. Запуск Ollama (в отдельном окне)
ollama serve

# 4. Скачивание модели (однократно)
ollama pull phi4-mini:latest

# 5. Создание backend/.env
copy backend\.env.example backend\.env
# отредактируйте: LLM_BASE_URL=http://localhost:11434/v1, LLM_MODEL=phi4-mini:latest

# 6. Запуск backend (в отдельном окне)
npm run dev:backend

# 7. Запуск frontend (в отдельном окне)
npm run dev:frontend

# 8. Открыть http://localhost:5173
```

---

## 5. Структура проекта

```
logic-simulator/
├── package.json              # корень: npm workspaces
├── package-lock.json
├── install.cmd / install.ps1 # установка и сборка
├── start.cmd / start.ps1     # запуск сервисов
├── stop.cmd / stop.ps1       # остановка сервисов
├── check.cmd / check.ps1     # проверка окружения
├── verify.cmd / verify.ps1   # проверка работоспособности
├── SETUP.md                  # этот файл
├── shared/                   # общий пакет @logic/shared
│   ├── src/types.ts          # типы и контракт пинов
│   ├── src/schema.ts         # Zod-схемы
│   └── src/index.ts
├── backend/                  # Express API
│   ├── .env.example
│   ├── src/server.ts
│   ├── src/config.ts
│   ├── src/llm/              # клиент LLM, промпт, ошибки
│   ├── src/routes/chat.ts
│   └── src/middleware/
└── frontend/                 # Vite + React
    ├── vite.config.ts        # прокси /api → :3001
    ├── src/App.tsx
    ├── src/store/            # Zustand + localStorage
    ├── src/simulator/        # движок симуляции
    ├── src/components/       # canvas, chat, nodes
    └── src/api/chatApi.ts
```

---

## 6. Порты

| Сервис | Порт | URL |
|--------|------|-----|
| Backend | 3001 | http://localhost:3001/api/health |
| Frontend | 5173 | http://localhost:5173 |
| Ollama | 11434 | http://localhost:11434/api/tags |

Если порт занят:
- **backend:** измените `PORT` в `backend/.env` (и `target` в `frontend/vite.config.ts`);
- **frontend:** измените `server.port` в `frontend/vite.config.ts` (и `CORS_ORIGIN` в `backend/.env`).

---

## 7. Типичные проблемы

| Симптом | Причина | Решение |
|---------|---------|---------|
| `Ошибка 'tsc' не является внутренней командой` | не установлены зависимости | `npm install` |
| `Cannot find module '@logic/shared'` | не собран shared | `npm run build:shared` |
| `Backend не отвечает` | порт 3001 занят или backend упал | закройте старое окно, запустите `start.cmd` снова |
| `Ollama не отвечает` | не запущена служба | `ollama serve` в отдельном окне |
| `Модель не найдена` | не скачана модель | `ollama pull phi4-mini:latest` |
| `402` в чате | на счету облачного LLM нет средств | проверьте баланс или переключитесь на Ollama |
| `504` в чате | таймаут LLM | увеличьте `LLM_TIMEOUT_MS` в `.env` |
| `502` в чате | модель нарушила JSON-контракт | сработает авторетрай; при повторе — смените модель |
| Долгий первый ответ | модель загружается в память | подождите 20–60 секунд |

---

## 8. Переключение на облачный LLM (опционально)

Если Ollama не подходит (нет ресурсов, нужна скорость) — можно использовать любой OpenAI-совместимый API.

В `backend/.env`:

```env
# Пример для DeepSeek
LLM_API_KEY=sk-ваш-ключ
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-chat
LLM_TIMEOUT_MS=60000
```

> **ВНИМАНИЕ:** ключ — секрет. Не коммитьте `.env` в Git. Файл уже в `.gitignore`.

---

## 9. Проверка, что всё готово к переносу

Перед копированием на другую машину убедитесь, что в репозитории:
- [ ] нет папок `node_modules/`;
- [ ] нет папок `dist/`;
- [ ] нет файла `backend/.env` (только `.env.example`);
- [ ] нет `*.log`;
- [ ] нет папки `backend/scripts/` (диагностические скрипты, не для продакшена);
- [ ] есть `package-lock.json` (для воспроизводимой установки);
- [ ] есть все файлы скриптов из раздела 2.

Команда для проверки (PowerShell, из корня проекта):

```powershell
Get-ChildItem -Recurse -Directory -Include node_modules,dist | Select-Object FullName
Get-ChildItem -Recurse -File -Include *.log,.env | Select-Object FullName
```

Если что-то нашлось — удалите перед переносом.
