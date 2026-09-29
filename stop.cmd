@echo off
chcp 65001 >nul
REM ============================================================
REM  stop.cmd - двойной клик для остановки всех сервисов проекта.
REM  Обёртка над scripts\stop.ps1.
REM ============================================================

cd /d "%~dp0"

echo.
echo  Остановка сервисов AI-симулятора логических схем...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\stop.ps1" %*

echo.
pause
