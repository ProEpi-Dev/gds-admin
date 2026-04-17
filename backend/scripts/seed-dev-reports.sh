#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$BACKEND_DIR"

if [[ -f ".env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source ".env"
  set +a
fi

echo "[seed-dev-reports] executando em: $BACKEND_DIR"
# Cada report recebe occurrence_location em JSON { latitude, longitude } (cidades BR fora do DF); ver seed-dev-reports.ts.

npx ts-node scripts/seed-dev-reports.ts "$@"
