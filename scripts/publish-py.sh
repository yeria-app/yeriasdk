#!/usr/bin/env bash
# Test, build, and publish the Python SDK (yeriasdk) to PyPI. Requires
# ~/.pypirc configured with the target index credentials.
set -euo pipefail
cd "$(dirname "$0")/../py"

python -m pip install --upgrade build twine
python -m pytest
python -m build
python -m twine upload dist/*
