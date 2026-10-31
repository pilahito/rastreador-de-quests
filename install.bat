@echo off
REM Rastreador de Quests - instalador de un clic para Windows / one-click installer
REM Doble clic aqui. Hace todo: herramientas, Vencord, compilar, inyectar y reiniciar Discord.
REM Double-click here. It does everything: tools, Vencord, build, inject and restart Discord.
REM Opciones avanzadas / advanced options: install.bat -VencordDir D:\Vencord -NoBuild
setlocal
chcp 65001 >nul 2>nul
cd /d "%~dp0"
where powershell >nul 2>nul
if errorlevel 1 (
    echo [X] PowerShell no encontrado / PowerShell not found.
    pause
    exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-vencord-plugin.ps1" -Yes -Inject -RestartDiscord %*
set "RC=%ERRORLEVEL%"
echo.
pause
exit /b %RC%
