<#
  verify.ps1 - расширенная проверка РАБОТОСПОСОБНОСТИ проекта.
  Запуск:  powershell -ExecutionPolicy Bypass -File .\scripts\verify.ps1

  В отличие от check.ps1 (проверяет окружение ДО запуска),
  этот скрипт проверяет, что запущенные сервисы РЕАЛЬНО работают:
   1) backend отвечает на /api/health;
   2) backend корректно отвечает на /api/chat (реальный запрос к LLM);
   3) frontend отдаёт HTML-страницу;
   4) данные из ответа LLM проходят контракт (валидный JSON схемы).

  Каждая проверка печатает понятную подсказку, если что-то не так.
  Код возврата = число проваленных проверок.
#>

$ErrorActionPreference = 'Continue'
$script:fail = 0

function Ok($msg)   { Write-Host "[ OK ]   $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "[ WARN ] $msg" -ForegroundColor Yellow }
function Bad($msg)  { Write-Host "[ FAIL ] $msg" -ForegroundColor Red; $script:fail++ }
function Info($msg) { Write-Host "         $msg" -ForegroundColor Gray }

function Get-Json($url, $timeoutSec = 8) {
  try { return Invoke-RestMethod -Uri $url -Method GET -TimeoutSec $timeoutSec }
  catch { return $null }
}

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  ПРОВЕРКА РАБОТОСПОСОБНОСТИ СЕРВИСОВ" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# --- 1. Backend health ---
Write-Host "1) Backend: GET /api/health" -ForegroundColor White
$health = Get-Json 'http://localhost:3001/api/health'
if ($health -and $health.status -eq 'ok') {
  Ok "Backend работает (status=ok)."
} else {
  Bad "Backend не отвечает на http://localhost:3001/api/health"
  Info "Запустите backend: npm run dev:backend"
  Info "Или весь проект: .\start.cmd"
}

# --- 2. Frontend HTML ---
Write-Host ""
Write-Host "2) Frontend: GET http://localhost:5173" -ForegroundColor White
try {
  $resp = Invoke-WebRequest -Uri 'http://localhost:5173' -TimeoutSec 8 -UseBasicParsing
  if ($resp.StatusCode -eq 200 -and $resp.Content -match '<div id="root"') {
    Ok "Frontend отдаёт HTML (200, найден #root)."
  } elseif ($resp.StatusCode -eq 200) {
    Warn "Frontend отвечает 200, но не найден <div id=\"root\">."
    Info "Возможно, открыт не тот адрес или старый кэш. Обновите страницу (Ctrl+F5)."
  } else {
    Bad "Frontend вернул код $($resp.StatusCode)."
  }
} catch {
  Bad "Frontend не отвечает на http://localhost:5173"
  Info "Запустите frontend: npm run dev:frontend"
  Info "Или весь проект: .\start.cmd"
}

# --- 3. Chat end-to-end ---
Write-Host ""
Write-Host "3) Backend: POST /api/chat (реальный запрос к LLM)" -ForegroundColor White
$body = @{
  messages = @(
    @{ role = 'user'; content = 'Собери полусумматор' }
  )
} | ConvertTo-Json -Depth 6

$chatOk = $false
try {
  $chatResp = Invoke-RestMethod -Uri 'http://localhost:3001/api/chat' `
    -Method POST -ContentType 'application/json; charset=utf-8' `
    -Body ([System.Text.Encoding]::UTF8.GetBytes($body)) -TimeoutSec 180

  if ($chatResp -and $chatResp.reply) {
    Ok "Чат ответил (reply длиной $($chatResp.reply.Length) симв.)."
    $chatOk = $true
  } else {
    Bad "Ответ чата не содержит поля 'reply'."
  }
} catch {
  $status = $null
  if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
  Bad "Запрос к /api/chat завершился ошибкой (HTTP $status)."
  switch ($status) {
    401 { Info "Ошибка авторизации LLM. Проверьте LLM_API_KEY в backend/.env." }
    402 { Info "На счету LLM-провайдера нет средств." }
    429 { Info "Слишком много запросов (rate limit). Подождите минуту." }
    502 { Info "LLM вернул невалидный ответ. Модель могла не уложиться в контракт." }
    504 { Info "Таймаут LLM. Увеличьте LLM_TIMEOUT_MS в backend/.env или возьмите модель полегче." }
    default {
      Info "Проверьте, что backend запущен и Ollama отвечает:"
      Info "  http://localhost:3001/api/health"
      Info "  http://localhost:11434/api/tags"
    }
  }
}

# --- 4. Контракт ответа LLM ---
Write-Host ""
Write-Host "4) Проверка контракта ответа LLM" -ForegroundColor White
if ($chatOk) {
  $types = @()
  if ($chatResp.circuit -and $chatResp.circuit.components) {
    $types = @($chatResp.circuit.components | ForEach-Object { $_.type } | Select-Object -Unique)
  }
  if ($types.Count -gt 0) {
    Ok "В ответе есть схема. Типы компонентов: $($types -join ', ')"
    $valid = @('SWITCH','LED','NOT','AND','OR','XOR','NAND','NOR')
    $invalid = @($types | Where-Object { $valid -notcontains $_ })
    if ($invalid.Count -gt 0) {
      Bad "Недопустимые типы компонентов: $($invalid -join ', ')"
      Info "Модель нарушила контракт. Усильте SYSTEM_PROMPT или смените модель."
    } else {
      Ok "Все типы компонентов допустимы."
    }
  } else {
    Warn "Ответ без схемы (только текст). Для вопроса это нормально."
    Info "Если ожидали схему — проверьте SYSTEM_PROMPT и модель."
  }
} else {
  Info "Пропущено: предыдущая проверка чата не прошла."
}

# --- Итог ---
Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
if ($script:fail -eq 0) {
  Write-Host "  РЕЗУЛЬТАТ: все проверки пройдены. Проект работает." -ForegroundColor Green
} else {
  Write-Host "  РЕЗУЛЬТАТ: провалено проверок: $($script:fail)" -ForegroundColor Red
  Write-Host "  Прочитайте подсказки [ FAIL ] выше — там указано, что делать." -ForegroundColor Yellow
}
Write-Host "=================================================" -ForegroundColor Cyan

exit $script:fail
