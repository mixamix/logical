@echo off
chcp 65001 >nul
REM ============================================================
REM  start.cmd - двойной клик для запуска всех сервисов.
REM  Просто обёртка над scripts\start.ps1 с обходом ExecutionPolicy.
REM ============================================================

cd /d "%~dp0"

echo.
echo  Запуск AI-симулятора логических схем...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start.ps1" %*

if errorlevel 1 (
  echo.
  echo  [!] Запуск завершился с ошибкой. См. сообщения выше.
  echo.
  pause
)
