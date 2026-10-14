#!/usr/bin/env bash
set -euo pipefail
cd /workspace/creditcard-dispenses-calculator
export npm_config_cache=/workspace/.cache/npm
export electron_config_cache=/workspace/.cache/electron
export NODE_USE_ENV_PROXY=1
npm ci
# Explicit installation also covers npm policies that skip dependency lifecycle scripts.
node node_modules/electron/install.js
npm run build
npm test
