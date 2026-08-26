#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "GeckoDraw requires Node.js and npm. Install Node.js, then run this script again."
  exit 1
fi

npm install
node scripts/setup-database.mjs
