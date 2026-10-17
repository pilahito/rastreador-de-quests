#requires -Version 5.1
<#
.SYNOPSIS
    Instala el Rastreador de Quests en Vencord (Windows) / Installs the quest tracker into Vencord (Windows).

.DESCRIPTION
    1. Busca tu copia de Vencord (o la clona si no existe).
    2. Copia el plugin a src\userplugins\questTracker.
    3. Ejecuta pnpm install + pnpm build y, si quieres, pnpm inject.

.EXAMPLE
    .\install.bat
    .\scripts\install-vencord-plugin.ps1 -VencordDir D:\Code\Vencord
    .\scripts\install-vencord-plugin.ps1 -NoBuild
    .\scripts\install-vencord-plugin.ps1 -Inject -Yes
#>
param(
    [string]$VencordDir = "",
    [string]$PluginDirName = "questTracker",
    [switch]$NoBuild,
    [switch]$Inject,
    [switch]$Yes,
    # Kept for compatibility with v1.0 / compatibilidad con la v1.0
    [switch]$Build
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

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

Write-Host ""
Write-Host "  Rastreador de Quests (QuestTracker) - instalador / installer" -ForegroundColor Magenta
Write-Host "  Plugin de SOLO LECTURA para Vencord / READ-ONLY Vencord plugin"
Write-Host ""

# --- 1. Herramientas / Tools -------------------------------------------------
Step "Comprobando herramientas / Checking tools"

if (-not (Has "git")) {
    Fail "No encuentro Git. Instálalo desde https://git-scm.com/download/win y vuelve a ejecutar.`n      Git not found. Install it from https://git-scm.com/download/win and run again."
}
Ok "git"

if (-not (Has "node")) {
    Fail "No encuentro Node.js. Instala Node 22 o superior (LTS) desde https://nodejs.org y vuelve a ejecutar.`n      Node.js not found. Install Node 22+ (LTS) from https://nodejs.org and run again."
}
$nodeMajor = [int]((node -v).TrimStart("v").Split(".")[0])
if ($nodeMajor -lt 22) {
    Fail "Tienes Node $(node -v); Vencord necesita Node 22 o superior: https://nodejs.org`n      You have Node $(node -v); Vencord needs Node 22+."
}
Ok "node $(node -v)"

if (-not (Has "pnpm")) {
    Warn "pnpm no está instalado; intento activarlo con corepack / pnpm missing; trying corepack"
    try { corepack enable 2>$null } catch { }
    if (-not (Has "pnpm")) {
        try { npm install -g pnpm | Out-Null } catch { }
    }
    if (-not (Has "pnpm")) {
        Fail "No pude instalar pnpm. Ejecuta 'npm install -g pnpm' en una consola de administrador.`n      Could not install pnpm. Run 'npm install -g pnpm' in an admin console."
    }
}
Ok "pnpm $(pnpm -v)"

# --- 2. Encontrar Vencord / Find Vencord -------------------------------------
Step "Buscando Vencord / Looking for Vencord"

function Test-Vencord($dir) {
    return $dir -and (Test-Path (Join-Path $dir "package.json")) -and (Test-Path (Join-Path $dir "src\plugins"))
}

$candidates = @()
if ($VencordDir) { $candidates += $VencordDir }
if ($env:VENCORD_DIR) { $candidates += $env:VENCORD_DIR }
$candidates += @(
    (Join-Path $repoRoot "..\Vencord"),
    (Join-Path $repoRoot "..\vencord"),
    (Join-Path $HOME "Vencord"),
    (Join-Path $HOME "Documents\Vencord"),
    (Join-Path $HOME "source\repos\Vencord")
)

$found = $null
foreach ($c in $candidates) {
    if (Test-Vencord $c) { $found = (Resolve-Path $c).Path; break }
}

if (-not $found) {
    $target = if ($VencordDir) { $VencordDir } else { Join-Path (Split-Path $repoRoot -Parent) "Vencord" }
    Warn "No encontré Vencord / Vencord not found."
    if (-not (Ask "¿Lo clono en '$target'? / Clone it into '$target'?")) {
        Fail "Clona Vencord tú mismo y vuelve a ejecutar con -VencordDir <ruta>:`n      git clone https://github.com/Vendicated/Vencord"
    }
    git clone https://github.com/Vendicated/Vencord "$target"
    if ($LASTEXITCODE -ne 0) { Fail "git clone falló / git clone failed" }
    $found = (Resolve-Path $target).Path
}
Ok "Vencord: $found"

# --- 3. Copiar plugin / Copy plugin ------------------------------------------
Step "Copiando Rastreador de Quests / Copying quest tracker"

$dest = Join-Path $found "src\userplugins\$PluginDirName"
if (Test-Path $dest) { Remove-Item -Recurse -Force $dest }
New-Item -ItemType Directory -Force -Path $dest | Out-Null
Copy-Item -Path (Join-Path $repoRoot "src\*") -Destination $dest -Recurse -Force
$count = (Get-ChildItem $dest -Recurse -File).Count
Ok "$count archivos en / files in: $dest"

if ($NoBuild) {
    Write-Host ""
    Write-Host "  Listo. Para terminar / To finish:" -ForegroundColor Green
    Write-Host "    cd `"$found`""
    Write-Host "    pnpm install --frozen-lockfile"
    Write-Host "    pnpm build"
    Write-Host "    pnpm inject"
    exit 0
}

# --- 4. Compilar / Build -----------------------------------------------------
Step "Compilando Vencord (puede tardar 1-2 min) / Building Vencord (1-2 min)"
Push-Location $found
try {
    pnpm install --frozen-lockfile
    if ($LASTEXITCODE -ne 0) { Fail "pnpm install falló. Prueba 'git pull' en Vencord y repite. / pnpm install failed. Try 'git pull' in Vencord and retry." }
    pnpm build
    if ($LASTEXITCODE -ne 0) { Fail "pnpm build falló. Copia el error de arriba en un issue. / pnpm build failed. Copy the error above into an issue." }
    Ok "Compilado / Built"

    if ($Inject -or (Ask "¿Inyecto Vencord en Discord ahora (pnpm inject)? / Inject Vencord into Discord now?")) {
        Step "Inyectando / Injecting (elige tu Discord en el menú / pick your Discord in the menu)"
        pnpm inject
        if ($LASTEXITCODE -ne 0) { Warn "pnpm inject devolvió error; cierra Discord y repítelo. / inject failed; close Discord and retry." }
    }
}
finally {
    Pop-Location
}

Write-Host ""
Write-Host "  Hecho. Reinicia Discord y activa RastreadorDeQuests en Ajustes > Vencord > Plugins." -ForegroundColor Green
Write-Host "  Done. Restart Discord and enable RastreadorDeQuests in Settings > Vencord > Plugins." -ForegroundColor Green
Write-Host "  Abre el panel con el botón del trofeo en el chat o con /quests." -ForegroundColor Green
Write-Host ""
