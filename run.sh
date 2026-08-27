#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "GeckoDraw requires Node.js and npm. Install Node.js, then run this script again."
  exit 1
fi

if [[ ! -x node_modules/.bin/next ]] || [[ ! -f node_modules/better-sqlite3/package.json ]]; then
  npm install
fi

if [[ ! -f data/geckodraw.sqlite3 ]]; then
  node scripts/setup-database.mjs
fi

SERVER_HOST="$(node -e '
  const fs = require("node:fs");
  const configPath = process.argv[1];

  try {
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    if (typeof config.SERVE_LAN !== "boolean") {
      throw new TypeError("SERVE_LAN must be a boolean");
    }
    // The IPv6 wildcard creates a dual-stack listener on macOS, allowing LAN
    // clients to connect over either IPv6 or IPv4.
    process.stdout.write(config.SERVE_LAN ? "::" : "127.0.0.1");
  } catch (error) {
    console.error(`Unable to read ${configPath}: ${error.message}`);
    process.exit(1);
  }
' "$PROJECT_DIR/server.json")"

npm run build
exec node_modules/.bin/next start "$@" --hostname "$SERVER_HOST"
