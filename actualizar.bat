@echo off
REM Rastreador de Quests - actualizador de un clic / one-click updater
REM Doble clic para actualizar a la ultima version. Descarga, compila, inyecta y reinicia Discord.
REM Double-click to update to the latest version. It downloads, builds, injects and restarts Discord.
REM Requiere install.ps1 en esta misma carpeta / requires install.ps1 next to this file.
setlocal
chcp 65001 >nul 2>nul
cd /d "%~dp0"
where powershell >nul 2>nul
if errorlevel 1 (
    echo [X] PowerShell no encontrado / PowerShell not found.
    pause
    exit /b 1
)
if not exist "%~dp0install.ps1" (
    echo [X] Falta install.ps1 en esta carpeta / install.ps1 is missing.
    pause
    exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1" %*
set "RC=%ERRORLEVEL%"
echo.
pause
exit /b %RC%
