#!/usr/bin/env bash
# Build the JS SDK (@numerum-tech/yeriasdk) into js/dist.
set -euo pipefail
cd "$(dirname "$0")/.."

npm -w js ci
npm -w js run build
echo "[build-js] dist ready in js/dist/"
