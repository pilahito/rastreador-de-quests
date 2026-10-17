@echo off
REM QuestTracker - instalador para Windows / Windows installer
REM Doble clic aqui / Double-click here. Extra options: install.bat -VencordDir D:\Vencord -Inject
setlocal
cd /d "%~dp0"
where powershell >nul 2>nul
if errorlevel 1 (
    echo [X] PowerShell no encontrado / PowerShell not found.
    pause
    exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-vencord-plugin.ps1" %*
set "RC=%ERRORLEVEL%"
echo.
pause
exit /b %RC%
