#requires -Version 5.1
<#
.SYNOPSIS
    Instalador y actualizador en un clic del Rastreador de Quests para Vencord (Windows).

.DESCRIPTION
    Descarga la última release del repositorio, la descomprime en una carpeta temporal y
    ejecuta el instalador incluido: comprueba herramientas, compila Vencord, inyecta el
    plugin en Discord y reinicia Discord al terminar.
    La carpeta temporal se borra sola al final (también si algo falla).

.EXAMPLE
    # Instalar o actualizar sin descargar nada a mano:
    irm https://raw.githubusercontent.com/pilahito/rastreador-de-quests/main/install.ps1 | iex

    # O con el ZIP / repo:
    powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1
    powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1 -DryRun
    powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1 -Tag v2.3.4 -NoRestart
#>
param(
    [string]$Tag = "latest",
    [switch]$DryRun,
    [switch]$NoRestart,
    [switch]$KeepTemp
)

$ErrorActionPreference = "Stop"
$repo = "pilahito/rastreador-de-quests"

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

Write-Host ""
Write-Host "  Rastreador de Quests - instalador/actualizador en un clic" -ForegroundColor Magenta
Write-Host "  One-click installer/updater" -ForegroundColor DarkGray
Write-Host ""

Step "Buscando la release ($Tag) en $repo"
try {
    if ($Tag -eq "latest") {
        $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases/latest" -Headers @{ "User-Agent" = "rastreador-installer" }
    } else {
        $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases/tags/$Tag" -Headers @{ "User-Agent" = "rastreador-installer" }
    }
} catch {
    Fail "No pude consultar GitHub: $($_.Exception.Message)"
}

$asset = $release.assets | Where-Object { $_.name -like "*.zip" } | Select-Object -First 1
if (-not $asset) { Fail "La release $($release.tag_name) no tiene ningún ZIP adjunto." }
Write-Host "  Release: $($release.tag_name)"
Write-Host "  ZIP:     $($asset.name) ($([math]::Round($asset.size / 1KB, 1)) KB)"

if ($DryRun) {
    Write-Host ""
    Write-Host "  DryRun: descargaría $($asset.browser_download_url) y ejecutaría el instalador." -ForegroundColor Yellow
    Write-Host "  DryRun: al terminar borraría la carpeta temporal." -ForegroundColor Yellow
    exit 0
}

$tmp = Join-Path $env:TEMP ("rastreador-de-quests-" + [guid]::NewGuid().ToString("N"))
$code = 1
try {
    New-Item -ItemType Directory -Force -Path $tmp | Out-Null
    $zip = Join-Path $tmp "plugin.zip"

    Step "Descargando / Downloading"
    try {
        Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $zip -UseBasicParsing
    } catch {
        Fail "No pude descargar el ZIP: $($_.Exception.Message)"
    }

    Step "Descomprimiendo / Extracting"
    try {
        Expand-Archive -Path $zip -DestinationPath $tmp -Force
    } catch {
        Fail "No pude descomprimir el ZIP: $($_.Exception.Message)"
    }

    $installer = Get-ChildItem $tmp -Recurse -Filter "install-vencord-plugin.ps1" -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $installer) { Fail "El ZIP no incluye scripts/install-vencord-plugin.ps1" }

    Step "Ejecutando el instalador del plugin / Running plugin installer"
    $arguments = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $installer.FullName, "-Yes", "-Inject")
    if (-not $NoRestart) { $arguments += "-RestartDiscord" }
    & powershell @arguments
    $code = $LASTEXITCODE
} finally {
    if ($KeepTemp) {
        Warn "Temp conservada / kept: $tmp"
    } else {
        try {
            if (Test-Path $tmp) { Remove-Item -Path $tmp -Recurse -Force -ErrorAction SilentlyContinue }
            if (-not (Test-Path $tmp)) { Ok "Temporales borrados / temp cleaned" }
        } catch { /* no es crítico */ }
    }
}

Write-Host ""
if ($code -eq 0) {
    Write-Host "  Listo. Rastreador de Quests instalado/actualizado. / Done." -ForegroundColor Green
} else {
    Write-Host "  El instalador terminó con errores (código $code). Revisa el mensaje de arriba." -ForegroundColor Red
}
exit $code
