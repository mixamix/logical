<#
  start.ps1 - автоматический запуск всех сервисов проекта.
  Запуск:  powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1

  Что делает:
   1) проверяет Node.js / npm;
   2) при необходимости ставит зависимости (npm install);
   3) собирает пакет shared (нужен backend'у и frontend'у);
   4) проверяет Ollama и модель;
   5) поднимает backend (порт 3001) и frontend (порт 5173) в двух окнах;
   6) открывает браузер на http://localhost:5173.

  Параметр -NoBrowser отключает автооткрытие браузера.
#>

param(
  [switch]$NoBrowser
)

$ErrorActionPreference = 'Continue'

function Ok($msg)   { Write-Host "[ OK ]   $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "[ WARN ] $msg" -ForegroundColor Yellow }
function Bad($msg)  { Write-Host "[ FAIL ] $msg" -ForegroundColor Red }
function Info($msg) { Write-Host "         $msg" -ForegroundColor Gray }

function Test-Port($port) {
  try {
    $c = New-Object System.Net.Sockets.TcpClient
    $c.Connect('127.0.0.1', $port)
    $c.Close()
    return $true
  } catch { return $false }
}

$rootDir = Split-Path -Parent $PSScriptRoot
Set-Location $rootDir

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  ЗАПУСК: AI-симулятор логических схем" -ForegroundColor Cyan
Write-Host "  Рабочая папка: $rootDir" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# --- 1. Node.js ---
Write-Host "[1/6] Проверка Node.js..." -ForegroundColor White
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
Write-Host "[2/6] Проверка зависимостей..." -ForegroundColor White
if (-not (Test-Path (Join-Path $rootDir 'node_modules'))) {
  Warn "node_modules отсутствует. Устанавливаю зависимости (npm install)..."
  & npm install
  if ($LASTEXITCODE -ne 0) {
    Bad "npm install завершился с ошибкой."
    Info "Проверьте интернет-соединение и повторите: npm install"
    exit 1
  }
  Ok "Зависимости установлены."
} else {
  Ok "node_modules на месте."
}

# --- 3. Сборка shared ---
Write-Host ""
Write-Host "[3/6] Сборка пакета shared..." -ForegroundColor White
& npm run build:shared
if ($LASTEXITCODE -ne 0 -or -not (Test-Path (Join-Path $rootDir 'shared\dist\index.js'))) {
  Bad "Не удалось собрать shared."
  Info "Запустите вручную: npm run build:shared"
  exit 1
}
Ok "shared собран."

# --- 4. Ollama ---
Write-Host ""
Write-Host "[4/6] Проверка Ollama..." -ForegroundColor White
$ollama = Get-Command ollama -ErrorAction SilentlyContinue
if (-not $ollama) {
  Bad "Ollama не найдена в PATH."
  Info "Скачайте и установите: https://ollama.com/download"
  Info "После установки перезапустите терминал."
  exit 1
}

$ollamaUp = $false
try {
  $tags = Invoke-RestMethod -Uri 'http://localhost:11434/api/tags' -TimeoutSec 5
  $ollamaUp = $true
} catch {
  $ollamaUp = $false
}

if (-not $ollamaUp) {
  Warn "Ollama не отвечает. Пробую запустить 'ollama serve' в отдельном окне..."
  Start-Process -FilePath 'cmd.exe' -ArgumentList '/k', 'ollama serve' | Out-Null
  Start-Sleep -Seconds 4
  try {
    $tags = Invoke-RestMethod -Uri 'http://localhost:11434/api/tags' -TimeoutSec 5
    $ollamaUp = $true
  } catch { $ollamaUp = $false }
}

if (-not $ollamaUp) {
  Bad "Ollama так и не запустилась."
  Info "Запустите вручную команду: ollama serve"
  Info "и повторите запуск скрипта."
  exit 1
}
Ok "Ollama отвечает."

# Проверка нужной модели (берём из .env, иначе phi4-mini:latest)
$needModel = 'phi4-mini:latest'
$envFile = Join-Path $rootDir 'backend\.env'
if (Test-Path $envFile) {
  $raw = Get-Content $envFile -Raw
  if ($raw -match '(?m)^\s*LLM_MODEL\s*=\s*(.+)$') {
    $needModel = $matches[1].Trim()
  }
}

$installed = @($tags.models | ForEach-Object { $_.name })
if ($installed -contains $needModel) {
  Ok "Модель '$needModel' установлена."
} else {
  Warn "Модели '$needModel' нет. Скачиваю (может занять несколько минут)..."
  & ollama pull $needModel
  if ($LASTEXITCODE -ne 0) {
    Bad "Не удалось скачать модель '$needModel'."
    Info "Скачайте вручную: ollama pull $needModel"
    Info "или укажите другую модель в backend/.env -> LLM_MODEL"
    exit 1
  }
  Ok "Модель '$needModel' загружена."
}

# --- 5. .env ---
Write-Host ""
Write-Host "[5/6] Проверка backend/.env..." -ForegroundColor White
if (-not (Test-Path $envFile)) {
  Warn "backend/.env отсутствует. Создаю из шаблона с настройками Ollama..."
  $envContent = @"
# Локальные переменные окружения backend. НЕ коммитится (см. .gitignore).
# --- LLM (OpenAI-совместимый API) ---
LLM_API_KEY=ollama
LLM_BASE_URL=http://localhost:11434/v1
LLM_MODEL=$needModel
LLM_TIMEOUT_MS=120000
# --- Сервер ---
PORT=3001
CORS_ORIGIN=http://localhost:5173
"@
  Set-Content -Path $envFile -Value $envContent -Encoding UTF8
  Ok "backend/.env создан."
} else {
  Ok "backend/.env на месте."
}

# --- 6. Порты и запуск ---
Write-Host ""
Write-Host "[6/6] Запуск сервисов..." -ForegroundColor White

if (Test-Port 3001) {
  Warn "Порт 3001 уже занят. Backend, возможно, уже запущен."
  Info "Если это старый процесс — закройте его и перезапустите скрипт."
} else {
  Start-Process -FilePath 'cmd.exe' -ArgumentList '/k', 'npm run dev:backend' -WorkingDirectory $rootDir | Out-Null
  Ok "Backend запускается в отдельном окне (http://localhost:3001)."
  Start-Sleep -Seconds 3
}

if (Test-Port 5173) {
  Warn "Порт 5173 уже занят. Frontend, возможно, уже запущен."
} else {
  Start-Process -FilePath 'cmd.exe' -ArgumentList '/k', 'npm run dev:frontend' -WorkingDirectory $rootDir | Out-Null
  Ok "Frontend запускается в отдельном окне (http://localhost:5173)."
}

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  ГОТОВО! Сервисы запускаются в отдельных окнах." -ForegroundColor Green
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host "  Backend:  http://localhost:3001/api/health" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""
Info "Первая сборка frontend может занять 10-20 секунд."
Info "Если браузер откроется слишком рано — обновите страницу (F5)."
Info "Для остановки закройте оба окна с сервисами."

if (-not $NoBrowser) {
  Start-Sleep -Seconds 6
  Start-Process 'http://localhost:5173' | Out-Null
  Ok "Браузер открыт: http://localhost:5173"
}
