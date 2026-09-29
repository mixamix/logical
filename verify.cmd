@echo off
chcp 65001 >nul
REM ============================================================
REM  verify.cmd - двойной клик для проверки РАБОТОСПОСОБНОСТИ сервисов.
REM  Обёртка над scripts\verify.ps1.
REM  Требует, чтобы backend и frontend уже были запущены (start.cmd).
REM ============================================================

cd /d "%~dp0"

echo.
echo  Проверка работоспособности AI-симулятора логических схем...
echo  (убедитесь, что сервисы уже запущены через start.cmd)
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\verify.ps1" %*

echo.
pause
