<#
  check.ps1 - проверка окружения и работоспособности проекта.
  Запуск:  powershell -ExecutionPolicy Bypass -File .\scripts\check.ps1

  Скрипт НИЧЕГО не меняет и не устанавливает. Он только проверяет
  и подсказывает, что нужно сделать.
#>

$ErrorActionPreference = 'Continue'
$script:fail = 0

function Ok($msg)   { Write-Host "[ OK ]   $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "[ WARN ] $msg" -ForegroundColor Yellow }
function Bad($msg)  { Write-Host "[ FAIL ] $msg" -ForegroundColor Red; $script:fail++ }
function Info($msg) { Write-Host "         $msg" -ForegroundColor Gray }

function Test-Port($port) {
  try {
    $c = New-Object System.Net.Sockets.TcpClient
    $c.Connect('127.0.0.1', $port)
    $c.Close()
    return $true
  } catch { return $false }
}

function Get-Json($url) {
  try {
    return Invoke-RestMethod -Uri $url -Method GET -TimeoutSec 5
  } catch {
    return $null
  }
}

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  ПРОВЕРКА ПРОЕКТА: AI-симулятор логических схем" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# --- 1. Node.js ---
Write-Host "1) Node.js и npm" -ForegroundColor White
$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
  $nodeVer = (& node -v) 2>$null
  Ok "Node.js найден: $nodeVer"
  $major = [int](($nodeVer -replace '^v','') -split '\.')[0]
  if ($major -lt 18) {
    Bad "Нужен Node.js 18 или новее. Установите: https://nodejs.org/"
  }
} else {
  Bad "Node.js НЕ найден."
  Info "Скачайте и установите: https://nodejs.org/ (LTS)"
  Info "После установки перезапустите терминал."
}

$npm = Get-Command npm -ErrorAction SilentlyContinue
if ($npm) { Ok "npm найден: $((& npm -v) 2>$null)" }
else { Bad "npm НЕ найден (обычно ставится вместе с Node.js)." }

# --- 2. Зависимости ---
Write-Host ""
Write-Host "2) Установка зависимостей" -ForegroundColor White
$rootDir = Split-Path -Parent $PSScriptRoot
if (Test-Path (Join-Path $rootDir 'node_modules')) { Ok "node_modules в корне есть." }
else { Warn "node_modules нет. Выполните: npm install" }

if (Test-Path (Join-Path $rootDir 'shared\dist\index.js')) { Ok "shared собран (dist есть)." }
else { Warn "shared не собран. Выполните: npm run build:shared" }

# --- 3. Ollama ---
Write-Host ""
Write-Host "3) Локальная модель (Ollama)" -ForegroundColor White
$ollama = Get-Command ollama -ErrorAction SilentlyContinue
if ($ollama) { Ok "Ollama установлена: $((& ollama -v) 2>$null)" }
else {
  Bad "Ollama НЕ найдена в PATH."
  Info "Скачайте: https://ollama.com/download"
}

$tags = Get-Json 'http://localhost:11434/api/tags'
if ($tags) {
  Ok "Ollama отвечает на http://localhost:11434"
  $models = @($tags.models | ForEach-Object { $_.name })
  if ($models.Count -gt 0) {
    Info "Доступные модели: $($models -join ', ')"
    $need = 'phi4-mini:latest'
    if ($models -contains $need) { Ok "Модель '$need' установлена." }
    else {
      Warn "Модель '$need' не найдена."
      Info "Выполните: ollama pull $need"
      Info "(или укажите другую модель в backend/.env -> LLM_MODEL)"
    }
  } else {
    Warn "В Ollama нет ни одной модели. Выполните: ollama pull phi4-mini:latest"
  }
} else {
  Bad "Ollama не отвечает на http://localhost:11434"
  Info "Запустите Ollama (ярлык в трее или команда: ollama serve)."
}

# --- 4. Файл .env ---
Write-Host ""
Write-Host "4) Конфигурация backend (.env)" -ForegroundColor White
$envFile = Join-Path $rootDir 'backend\.env'
if (Test-Path $envFile) {
  Ok "backend/.env существует."
  $raw = Get-Content $envFile -Raw
  foreach ($key in @('LLM_BASE_URL','LLM_MODEL','PORT','CORS_ORIGIN')) {
    if ($raw -match "(?m)^\s*$key\s*=\s*(.+)$") {
      Info "$key = $($matches[1].Trim())"
    } else {
      Warn "В .env нет переменной $key (будет использовано значение по умолчанию)."
    }
  }
} else {
  Warn "backend/.env отсутствует."
  Info "Скопируйте шаблон: copy backend\.env.example backend\.env"
  Info "и укажите LLM_BASE_URL=http://localhost:11434/v1, LLM_MODEL=phi4-mini:latest"
}

# --- 5. Порты ---
Write-Host ""
Write-Host "5) Свобода портов (3001 backend, 5173 frontend)" -ForegroundColor White
if (Test-Port 3001) {
  $h = Get-Json 'http://localhost:3001/api/health'
  if ($h -and $h.status -eq 'ok') { Ok "Порт 3001 занят НАШИМ backend (health: ok)." }
  else { Warn "Порт 3001 занят, но это не наш backend. Освободите порт или смените PORT в .env." }
} else {
  Info "Порт 3001 свободен (backend сейчас не запущен)."
}

if (Test-Port 5173) { Warn "Порт 5173 занят (frontend уже запущен?)." }
else { Info "Порт 5173 свободен (frontend сейчас не запущен)." }

# --- Итог ---
Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
if ($script:fail -eq 0) {
  Write-Host "  РЕЗУЛЬТАТ: всё готово. Запускайте .\scripts\start.ps1" -ForegroundColor Green
} else {
  Write-Host "  РЕЗУЛЬТАТ: найдено проблем: $($script:fail)" -ForegroundColor Red
  Write-Host "  Прочитайте подсказки [ FAIL ] / [ WARN ] выше." -ForegroundColor Yellow
}
Write-Host "=================================================" -ForegroundColor Cyan

exit $script:fail
