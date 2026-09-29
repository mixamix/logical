@echo off
chcp 65001 >nul
REM ============================================================
REM  check.cmd - двойной клик для проверки окружения проекта.
REM  Просто обёртка над scripts\check.ps1.
REM ============================================================

cd /d "%~dp0"

echo.
echo  Проверка окружения AI-симулятора логических схем...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\check.ps1" %*

echo.
pause
