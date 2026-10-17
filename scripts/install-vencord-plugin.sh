#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_DIR="${VENCORD_DIR:-${ROOT_DIR}/../Vencord}"
PLUGIN_DIR="${PLUGIN_DIR:-questTracker}"
BUILD_AFTER_COPY="false"

usage() {
  cat <<'EOF'
Usage: ./scripts/install-vencord-plugin.sh [--vencord-dir PATH] [--plugin-dir NAME] [--build]

Copies the quest tracker source files into a Vencord source tree and optionally builds/injects it.

Options:
  --vencord-dir PATH   Path to the Vencord source checkout. Default: ../Vencord
  --plugin-dir NAME    Plugin folder name inside src/userplugins. Default: questTracker
  --build              Run pnpm install, build and inject after copying
  -h, --help           Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --vencord-dir)
      TARGET_DIR="$2"
      shift 2
      ;;
    --plugin-dir)
      PLUGIN_DIR="$2"
      shift 2
      ;;
    --build)
      BUILD_AFTER_COPY="true"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ ! -d "$TARGET_DIR" ]]; then
  echo "Vencord directory not found: $TARGET_DIR"
  echo "Clone it first: git clone https://github.com/Vendicated/Vencord \"$TARGET_DIR\""
  exit 1
fi

DEST_DIR="$TARGET_DIR/src/userplugins/$PLUGIN_DIR"
rm -rf "$DEST_DIR"
mkdir -p "$DEST_DIR"
cp -R "$ROOT_DIR/src/." "$DEST_DIR/"

cat <<EOF
Rastreador de Quests (QuestTracker) copiado a / copied to:
  $DEST_DIR

Importante / Important:
  - La carpeta debe ser camelCase / folder must be camelCase, e.g.: questTracker
  - Vencord tiene que compilarse desde el código / Vencord must be built from source
  - El modo automático viene APAGADO y exige aceptar un aviso de riesgo
    Automation is OFF by default and requires accepting a risk notice
EOF

if [[ "$BUILD_AFTER_COPY" == "true" ]]; then
  echo "Building Vencord from source..."
  cd "$TARGET_DIR"
  pnpm install --frozen-lockfile
  pnpm build
  pnpm inject
  echo "Done. Restart Discord and open Settings → Vencord → Plugins."
fi
