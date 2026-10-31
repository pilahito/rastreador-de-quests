#requires -Version 5.1
<#
.SYNOPSIS
    Instala el Rastreador de Quests en Vencord (Windows). Un clic.

.DESCRIPTION
    1. Comprueba/instala Git y Node.js si faltan (winget).
    2. Busca tu copia de Vencord; si no existe, la clona.
    3. Copia el plugin a src\userplugins\questTracker.
    4. Prepara el pnpm que fija Vencord y compila.
    5. Inyecta Vencord en Discord sin preguntas y reinicia Discord.

.EXAMPLE
    .\install.bat
    .\scripts\install-vencord-plugin.ps1 -VencordDir D:\Code\Vencord
    .\scripts\install-vencord-plugin.ps1 -NoBuild
    .\scripts\install-vencord-plugin.ps1 -DryRun
#>
param(
    [string]$VencordDir = "",
    [string]$PluginDirName = "questTracker",
    [switch]$NoBuild,
    [switch]$Inject,
    [switch]$RestartDiscord,
    [switch]$Yes,
    [switch]$DryRun,
    # Kept for compatibility with v1.0 / compatibilidad con la v1.0
    [switch]$Build
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

# Consola en UTF-8 para que tildes y símbolos se vean bien en PowerShell 5.1.
try { [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false) } catch { }
try { chcp 65001 | Out-Null } catch { }

function Step($msg) { Write-Host ""; Write-Host "==> $msg" -ForegroundColor Cyan }
function Ok($msg) { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "  [!] $msg" -ForegroundColor Yellow }
function Fail($msg) {
    Write-Host ""
    Write-Host "  [X] $msg" -ForegroundColor Red
    Write-Host ""
    exit 1
}
function Ask($question) {
    if ($Yes) { return $true }
    $answer = Read-Host "$question (s/n | y/n)"
    return $answer -match '^(s|si|sí|y|yes)$'
}
function Has($cmd) { return [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }

# PowerShell 5.1 convierte el stderr de los comandos nativos en ErrorRecord y con
# $ErrorActionPreference = "Stop" aborta aunque el comando vaya bien (pnpm escribe
# el comando a ejecutar en stderr). Redirigimos a un archivo y mostramos la salida.
function Invoke-Native($commandLine) {
    $log = Join-Path $env:TEMP ("qt-native-" + [guid]::NewGuid().ToString("N") + ".log")
    $previous = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        & cmd /c ("$commandLine > `"$log`" 2>&1")
        $code = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previous
    }
    if (Test-Path $log) {
        Get-Content $log | Out-Host
        Remove-Item $log -Force -ErrorAction SilentlyContinue
    }
    return $code
}

# Igual, pero devuelve la salida como texto (para versiones).
function Invoke-NativeText($commandLine) {
    $log = Join-Path $env:TEMP ("qt-native-" + [guid]::NewGuid().ToString("N") + ".log")
    $previous = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        & cmd /c ("$commandLine > `"$log`" 2>&1")
    } finally {
        $ErrorActionPreference = $previous
    }
    $text = ""
    if (Test-Path $log) {
        $text = (Get-Content $log -Raw)
        Remove-Item $log -Force -ErrorAction SilentlyContinue
    }
    return $text.Trim()
}

function Refresh-Path {
    $machine = [Environment]::GetEnvironmentVariable("Path", "Machine")
    $user = [Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path = "$machine;$user"
}

function Ensure-Tool($name, $wingetId, $url) {
    if (Has $name) { return $true }
    if ($DryRun) {
        Warn "Falta $name (DryRun: no se instala)."
        return $false
    }
    if (Has "winget") {
        Warn "$name no está instalado; lo instalo con winget (puede pedir permiso de administrador)…"
        try {
            Invoke-Native "winget install --id $wingetId -e --accept-package-agreements --accept-source-agreements --silent" | Out-Null
        } catch { /* seguimos abajo */ }
        Refresh-Path
    }
    if (Has $name) { Ok "$name instalado"; return $true }
    Warn "No pude instalar $name automáticamente. Instálalo desde $url y vuelve a abrir install.bat."
    return $false
}

Write-Host ""
Write-Host "  Rastreador de Quests (QuestTracker) - instalador / installer" -ForegroundColor Magenta
Write-Host "  Plugin de SOLO LECTURA para Vencord / READ-ONLY Vencord plugin" -ForegroundColor DarkGray
Write-Host ""

# --- 1. Herramientas / Tools -------------------------------------------------
Step "Comprobando herramientas / Checking tools"

if (-not (Ensure-Tool "git" "Git.Git" "https://git-scm.com/download/win")) {
    Fail "Falta Git. Instálalo desde https://git-scm.com/download/win y vuelve a ejecutar."
}
Ok "git $(git --version)"

if (-not (Ensure-Tool "node" "OpenJS.NodeJS.LTS" "https://nodejs.org")) {
    Fail "Falta Node.js. Instala Node 22+ (LTS) desde https://nodejs.org y vuelve a ejecutar."
}
$nodeVersion = (node -v).Trim()
$nodeMajor = [int]$nodeVersion.TrimStart("v").Split(".")[0]
if ($nodeMajor -lt 22) {
    Fail "Tienes Node $nodeVersion; Vencord necesita Node 22 o superior: https://nodejs.org"
}
Ok "node $nodeVersion"

# --- 2. Encontrar Vencord / Find Vencord -------------------------------------
Step "Buscando Vencord / Looking for Vencord"

function Test-Vencord($dir) {
    if (-not $dir) { return $false }
    return (Test-Path (Join-Path $dir "package.json")) -and (Test-Path (Join-Path $dir "src\plugins"))
}

$candidates = @()
if ($VencordDir) { $candidates += $VencordDir }
if ($env:VENCORD_DIR) { $candidates += $env:VENCORD_DIR }
# Primero la copia del usuario (la que suele estar inyectada), luego el resto.
$candidates += @(
    (Join-Path $HOME "Vencord"),
    (Join-Path $HOME "Documents\Vencord"),
    (Join-Path $HOME "source\repos\Vencord"),
    (Join-Path $repoRoot "..\Vencord"),
    (Join-Path $repoRoot "..\vencord")
)
if ($env:LOCALAPPDATA) {
    $candidates += @(
        (Join-Path $env:LOCALAPPDATA "Vencord"),
        (Join-Path $env:LOCALAPPDATA "Vencord\source")
    )
}

$found = $null
foreach ($c in $candidates) {
    if (Test-Vencord $c) { $found = (Resolve-Path $c).Path; break }
}

if (-not $found) {
    $target = if ($VencordDir) { $VencordDir } else { Join-Path $HOME "Vencord" }
    Warn "No encontré una copia de Vencord en el equipo / Vencord source not found."
    if ($DryRun) {
        Write-Host ""
        Write-Host "  DryRun: clonaría Vencord en '$target' y seguiría con la instalación." -ForegroundColor Yellow
        exit 0
    }
    if (-not $Yes) {
        if (-not (Ask "¿Clono Vencord en '$target'? / Clone Vencord into '$target'?")) {
            Fail "Clona Vencord tú mismo y vuelve a ejecutar con -VencordDir <ruta>:`n      git clone https://github.com/Vendicated/Vencord"
        }
    }
    Step "Clonando Vencord en $target / Cloning Vencord"
    $cloneCode = Invoke-Native "git clone --depth 1 https://github.com/Vendicated/Vencord `"$target`""
    if ($cloneCode -ne 0) { Fail "git clone falló / git clone failed" }
    $found = (Resolve-Path $target).Path
}
Ok "Vencord: $found"

# pnpm que fija el propio Vencord (packageManager), para no pelearse con versiones viejas.
$pnpmCmd = "pnpm"
$pinnedPnpm = $null
try {
    $pkg = Get-Content (Join-Path $found "package.json") -Raw | ConvertFrom-Json
    if ($pkg.packageManager -match '^pnpm@(.+)$') { $pinnedPnpm = $matches[1] }
} catch { /* sin pin */ }
if ($pinnedPnpm) {
    $current = $null
    try { $current = Invoke-NativeText "`"pnpm`" -v" } catch { }
    if (-not $current -or $current.Trim() -ne $pinnedPnpm) {
        if (-not $DryRun) {
            Warn "Vencord fija pnpm $pinnedPnpm; preparo esa versión (una sola vez)…"
            Invoke-Native "npm install -g --allow-scripts=pnpm pnpm@$pinnedPnpm" | Out-Null
            if (-not (Test-Path (Join-Path $env:APPDATA "npm\pnpm.cmd"))) {
                Invoke-Native "npm install -g pnpm@$pinnedPnpm" | Out-Null
            }
            Refresh-Path
        }
    }
    $candidateCmd = Join-Path $env:APPDATA "npm\pnpm.cmd"
    if (Test-Path $candidateCmd) { $pnpmCmd = $candidateCmd }
}
if (-not $DryRun) {
    if (-not (Has "pnpm") -and -not (Test-Path $pnpmCmd)) {
        Fail "No pude preparar pnpm. Ejecuta 'npm install -g pnpm' y vuelve a intentarlo."
    }
    Ok "pnpm: $(Invoke-NativeText "`"$pnpmCmd`" -v")"
}

if ($DryRun) {
    Step "DryRun: plan"
    $destPreview = (Join-Path (Join-Path $found "src\userplugins") $PluginDirName)
    Write-Host "  1. Copiaría src\* a $destPreview"
    Write-Host "  2. Ejecutaría: pnpm install --frozen-lockfile; pnpm build (con pnpm $pinnedPnpm)"
    Write-Host "  3. Inyectaría Vencord en Discord con: node scripts/runInstaller.mjs -- -install -branch auto"
    if ($RestartDiscord) { Write-Host "  4. Reiniciaría Discord" }
    Write-Host ""
    Write-Host "  DryRun OK (no se ha modificado nada)." -ForegroundColor Green
    exit 0
}

# --- 3. Copiar plugin / Copy plugin ------------------------------------------
Step "Copiando Rastreador de Quests / Copying quest tracker"

$dest = (Join-Path (Join-Path $found "src\userplugins") $PluginDirName)
if (Test-Path $dest) { Remove-Item -Recurse -Force $dest }
New-Item -ItemType Directory -Force -Path $dest | Out-Null
Copy-Item -Path (Join-Path $repoRoot "src\*") -Destination $dest -Recurse -Force
$count = (Get-ChildItem $dest -Recurse -File).Count
Ok "$count archivos en / files in: $dest"

if ($NoBuild) {
    Write-Host ""
    Write-Host "  Listo. Para terminar / To finish:" -ForegroundColor Green
    Write-Host "    cd `"$found`""
    Write-Host "    $pnpmCmd install --frozen-lockfile"
    Write-Host "    $pnpmCmd build"
    Write-Host "    node scripts/runInstaller.mjs -- -install -branch auto"
    exit 0
}

# --- 4. Compilar / Build -----------------------------------------------------
Step "Compilando Vencord (puede tardar 1-2 min) / Building Vencord (1-2 min)"
Push-Location $found
try {
    $installCode = Invoke-Native "`"$pnpmCmd`" install --frozen-lockfile"
    if ($installCode -ne 0) {
        Warn "El lockfile no coincide; reintento sin --frozen-lockfile."
        $installCode = Invoke-Native "`"$pnpmCmd`" install"
        if ($installCode -ne 0) { Fail "pnpm install falló. Prueba 'git pull' en Vencord y repite." }
    }
    $buildCode = Invoke-Native "`"$pnpmCmd`" build"
    if ($buildCode -ne 0) { Fail "pnpm build falló. Copia el error de arriba en un issue." }
    Ok "Compilado / Built"

    # --- 5. Inyectar / Inject ---------------------------------------------
    $doInject = $Inject
    if (-not $doInject -and -not $Yes) {
        $doInject = Ask "¿Inyecto Vencord en Discord ahora? / Inject Vencord into Discord now?"
    }
    if ($doInject) {
        Step "Inyectando Vencord en Discord / Injecting Vencord"
        Get-Process Discord, DiscordPTB, DiscordCanary -ErrorAction SilentlyContinue | Stop-Process -Force
        Start-Sleep -Seconds 2
        $injectCode = Invoke-Native "node scripts/runInstaller.mjs -- -install -branch auto"
        if ($injectCode -ne 0) {
            Warn "El instalador devolvió error. Abre Discord y ejecuta 'node scripts/runInstaller.mjs -- -install' a mano."
        } else {
            Ok "Vencord inyectado / injected"
        }
    }
}
finally {
    Pop-Location
}

# --- 6. Reiniciar Discord / Restart Discord ---------------------------------
if ($RestartDiscord) {
    Step "Reiniciando Discord / Restarting Discord"
    Get-Process Discord, DiscordPTB, DiscordCanary -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Sleep -Seconds 3
    $started = $false
    foreach ($folder in @("Discord", "DiscordPTB", "DiscordCanary")) {
        $base = Join-Path $env:LOCALAPPDATA $folder
        if (-not (Test-Path $base)) { continue }
        $app = Get-ChildItem $base -Directory -Filter "app-*" -ErrorAction SilentlyContinue | Sort-Object Name -Descending | Select-Object -First 1
        if ($app) {
            $exe = Join-Path $app.FullName "Discord.exe"
            if (Test-Path $exe) {
                Start-Process -FilePath $exe
                Ok "Discord reiniciado / restarted"
                $started = $true
                break
            }
        }
    }
    if (-not $started) { Warn "No encontré Discord.exe; ábrelo a mano." }
}

Write-Host ""
Write-Host "  Hecho. Activa RastreadorDeQuests en Ajustes > Vencord > Plugins." -ForegroundColor Green
Write-Host "  Done. Enable RastreadorDeQuests in Settings > Vencord > Plugins." -ForegroundColor Green
Write-Host "  Abre el panel con el botón del trofeo del chat o con /quests." -ForegroundColor Green
Write-Host ""
