<#
  install.ps1 - установка зависимостей и полная сборка проекта
  на новой машине (или после чистой копии репозитория).

  Запуск:  powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1

  Что делает:
   1) проверяет Node.js/npm;
   2) ставит все зависимости (npm install в корне = workspaces);
   3) собирает shared (нужен backend и frontend);
   4) собирает backend и frontend (production-сборка, проверка типов);
   5) создаёт backend/.env из шаблона, если его ещё нет.

  Ничего НЕ запускает — только готовит проект к работе.
#>

$ErrorActionPreference = 'Continue'

function Ok($msg)   { Write-Host "[ OK ]   $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "[ WARN ] $msg" -ForegroundColor Yellow }
function Bad($msg)  { Write-Host "[ FAIL ] $msg" -ForegroundColor Red }
function Info($msg) { Write-Host "         $msg" -ForegroundColor Gray }

$rootDir = Split-Path -Parent $PSScriptRoot
Set-Location $rootDir

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  УСТАНОВКА: AI-симулятор логических схем" -ForegroundColor Cyan
Write-Host "  Рабочая папка: $rootDir" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# --- 1. Node.js ---
Write-Host "[1/5] Проверка Node.js..." -ForegroundColor White
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  Bad "Node.js не найден."
  Info "Установите Node.js 18+ с https://nodejs.org/ и перезапустите терминал."
  exit 1
}
$nodeVer = (& node -v) 2>$null
$major = [int](($nodeVer -replace '^v','') -split '\.')[0]
if ($major -lt 18) {
  Bad "Версия Node.js $nodeVer слишком старая. Нужна 18+."
  Info "Обновите Node.js: https://nodejs.org/"
  exit 1
}
Ok "Node.js $nodeVer"

# --- 2. Зависимости ---
Write-Host ""
Write-Host "[2/5] Установка зависимостей (npm install)..." -ForegroundColor White
& npm install
if ($LASTEXITCODE -ne 0) {
  Bad "npm install завершился с ошибкой."
  Info "Проверьте интернет-соединение и повторите: npm install"
  exit 1
}
Ok "Зависимости установлены."

# --- 3. Сборка shared ---
Write-Host ""
Write-Host "[3/5] Сборка shared..." -ForegroundColor White
& npm run build:shared
if ($LASTEXITCODE -ne 0) {
  Bad "Не удалось собрать shared."
  Info "Запустите вручную: npm run build:shared"
  exit 1
}
Ok "shared собран."

# --- 4. Сборка backend и frontend ---
Write-Host ""
Write-Host "[4/5] Сборка backend и frontend..." -ForegroundColor White
& npm run build:backend
if ($LASTEXITCODE -ne 0) {
  Bad "Не удалось собрать backend."
  Info "Запустите вручную: npm run build:backend"
  exit 1
}
Ok "backend собран."

& npm run build:frontend
if ($LASTEXITCODE -ne 0) {
  Bad "Не удалось собрать frontend."
  Info "Запустите вручную: npm run build:frontend"
  exit 1
}
Ok "frontend собран."

# --- 5. backend/.env ---
Write-Host ""
Write-Host "[5/5] Проверка backend/.env..." -ForegroundColor White
$envFile = Join-Path $rootDir 'backend\.env'
if (Test-Path $envFile) {
  Ok "backend/.env уже существует (не трогаю)."
} else {
  Warn "backend/.env отсутствует. Создаю с настройками Ollama по умолчанию..."
  $envContent = @"
# Локальные переменные окружения backend. НЕ коммитится (см. .gitignore).
# --- LLM (OpenAI-совместимый API) ---
LLM_API_KEY=ollama
LLM_BASE_URL=http://localhost:11434/v1
LLM_MODEL=phi4-mini:latest
LLM_TIMEOUT_MS=120000
# --- Сервер ---
PORT=3001
CORS_ORIGIN=http://localhost:5173
"@
  Set-Content -Path $envFile -Value $envContent -Encoding UTF8
  Ok "backend/.env создан (значения по умолчанию — Ollama)."
  Info "Если нужен облачный провайдер (DeepSeek/OpenAI) — отредактируйте backend/.env."
}

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  ГОТОВО! Проект установлен и собран." -ForegroundColor Green
Write-Host "  Дальше: .\scripts\check.ps1  — проверка окружения" -ForegroundColor Green
Write-Host "          .\scripts\start.ps1  — запуск всех сервисов" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Cyan
