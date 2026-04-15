#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Typecheck
tsc --noEmit

# Bundle: inline the SDK + OTel, externalize pi packages (loaded by pi's runtime)
npx esbuild src/index.ts \
  --bundle \
  --format=esm \
  --platform=node \
  --target=es2022 \
  --outfile=dist/index.js \
  --external:@mariozechner/pi-coding-agent \
  --external:@mariozechner/pi-ai \
  --external:@sinclair/typebox \
  --external:@grpc/grpc-js \
  --external:@grpc/proto-loader

echo "Built dist/index.js"
