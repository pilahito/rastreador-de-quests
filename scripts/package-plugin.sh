#!/usr/bin/env bash
# Crea dist/rastreador-de-quests-vX.Y.Z.zip listo para descomprimir y ejecutar install.bat
# Builds dist/rastreador-de-quests-vX.Y.Z.zip ready to unzip and run install.bat
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="${1:-dev}"
DIST_DIR="$ROOT_DIR/dist"
STAGE="$ROOT_DIR/.tmp-package"
PKG="$STAGE/rastreador-de-quests"
OUT="$DIST_DIR/rastreador-de-quests-$VERSION.zip"

rm -rf "$STAGE" "$OUT"
mkdir -p "$DIST_DIR" "$PKG/src" "$PKG/scripts"

cp -R "$ROOT_DIR/src/." "$PKG/src/"
cp "$ROOT_DIR/scripts/install-vencord-plugin.ps1" "$ROOT_DIR/scripts/install-vencord-plugin.sh" "$PKG/scripts/"
cp "$ROOT_DIR/install.bat" "$ROOT_DIR/LICENSE" "$ROOT_DIR/README.md" "$ROOT_DIR/CHANGELOG.md" "$ROOT_DIR/THIRD_PARTY_NOTICES.md" "$PKG/"

(cd "$STAGE" && python3 - "$OUT" <<'PY'
import os, sys, zipfile
out = sys.argv[1]
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as zf:
    for dirpath, _, files in os.walk("rastreador-de-quests"):
        for name in sorted(files):
            full = os.path.join(dirpath, name)
            zf.write(full, full)
PY
)

rm -rf "$STAGE"
echo "Package created at: $OUT"
