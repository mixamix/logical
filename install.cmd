@echo off
chcp 65001 >nul
REM ============================================================
REM  install.cmd - двойной клик для установки и сборки проекта.
REM  Обёртка над scripts\install.ps1.
REM ============================================================

cd /d "%~dp0"

echo.
echo  Установка и сборка AI-симулятора логических схем...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install.ps1" %*

if errorlevel 1 (
  echo.
  echo  [!] Установка завершилась с ошибкой. См. сообщения выше.
  echo.
)
pause
