#!/usr/bin/env bash
# Build the yeria-demo Docker image standalone. Useful for CI where the
# yeria-deployment compose file isn't available. The build context is the
# yeria-sdk workspace root so the Dockerfile can pick up both js/ and demo/.
set -euo pipefail
cd "$(dirname "$0")/.."

TAG="${1:-latest}"
docker build -t "yeria-demo:$TAG" -f demo/Dockerfile .
echo "[image:demo] built yeria-demo:$TAG"
