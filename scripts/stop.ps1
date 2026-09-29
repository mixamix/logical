<#
  stop.ps1 - остановка сервисов проекта (backend и frontend).
  Запуск:  powershell -ExecutionPolicy Bypass -File .\scripts\stop.ps1

  Освобождает порты 3001 (backend) и 5173 (frontend).
  Ollama НЕ трогает - она общая для системы.
#>

$ErrorActionPreference = 'Continue'

function Ok($msg)   { Write-Host "[ OK ]   $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "[ WARN ] $msg" -ForegroundColor Yellow }
function Info($msg) { Write-Host "         $msg" -ForegroundColor Gray }

function Stop-Port($port, $label) {
  $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  if (-not $conns) {
    Info "Порт $port ($label) свободен."
    return
  }
  $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($procId in $pids) {
    try {
      $p = Get-Process -Id $procId -ErrorAction Stop
      Stop-Process -Id $procId -Force
      Ok "Остановлен процесс $($p.ProcessName) (PID $procId) на порту $port ($label)."
    } catch {
      Warn "Не удалось остановить PID $procId на порту $port ($label)."
      Info "Остановите его вручную через Диспетчер задач."
    }
  }
}

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  ОСТАНОВКА сервисов AI-симулятора" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

Stop-Port 3001 'backend'
Stop-Port 5173 'frontend'

Write-Host ""
Write-Host "Готово. Отдельные окна терминалов с сервисами можно закрыть вручную." -ForegroundColor Green
