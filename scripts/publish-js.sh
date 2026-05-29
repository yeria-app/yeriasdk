#!/usr/bin/env bash
# Test, build, and publish @numerum-tech/yeriasdk to the registry configured in
# js/package.json (publishConfig). Requires `npm login` beforehand.
set -euo pipefail
cd "$(dirname "$0")/../js"

npm test
npm run build
npm publish --access public
