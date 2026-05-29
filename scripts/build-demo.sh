#!/usr/bin/env bash
# Build the demo (@numerum-tech/yeriasdk-demo) into demo/dist. Builds the SDK first
# because the demo imports its compiled output via the workspace symlink.
set -euo pipefail
cd "$(dirname "$0")/.."

npm install
npm -w js run build
npm -w demo run build
echo "[build-demo] dist ready in demo/dist/"
