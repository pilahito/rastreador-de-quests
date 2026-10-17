#!/usr/bin/env bash
# Crea dist/quest-tracker-vX.Y.Z.zip listo para descomprimir y ejecutar install.bat
# Builds dist/quest-tracker-vX.Y.Z.zip ready to unzip and run install.bat
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="${1:-dev}"
DIST_DIR="$ROOT_DIR/dist"
STAGE="$ROOT_DIR/.tmp-package"
PKG="$STAGE/quest-tracker"
OUT="$DIST_DIR/quest-tracker-$VERSION.zip"

rm -rf "$STAGE" "$OUT"
mkdir -p "$DIST_DIR" "$PKG/src" "$PKG/scripts"

find "$ROOT_DIR/src" -maxdepth 1 -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.css' \) -exec cp {} "$PKG/src/" \;
cp "$ROOT_DIR/scripts/install-vencord-plugin.ps1" "$ROOT_DIR/scripts/install-vencord-plugin.sh" "$PKG/scripts/"
cp "$ROOT_DIR/install.bat" "$ROOT_DIR/LICENSE" "$ROOT_DIR/README.md" "$PKG/"

(cd "$STAGE" && python3 - "$OUT" <<'PY'
import os, sys, zipfile
out = sys.argv[1]
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as zf:
    for dirpath, _, files in os.walk("quest-tracker"):
        for name in sorted(files):
            full = os.path.join(dirpath, name)
            zf.write(full, full)
PY
)

rm -rf "$STAGE"
echo "Package created at: $OUT"
