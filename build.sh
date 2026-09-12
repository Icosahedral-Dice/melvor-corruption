#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

OUT="../melvor-corruption.zip"

rm -f "$OUT"
zip -r "$OUT" manifest.json setup.mjs src templates css README.md LICENSE -x '*.DS_Store'

echo "Built $(cd .. && pwd)/melvor-corruption.zip"
