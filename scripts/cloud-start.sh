#!/usr/bin/env bash
set -euo pipefail
cd /workspace/creditcard-dispenses-calculator
mkdir -p .runtime
# Cloud onboarding validates the UI internally; the normal desktop command is npm start.
if ! curl --fail --silent http://127.0.0.1:5173/ > /dev/null; then
  nohup node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173 --strictPort > .runtime/vite.log 2>&1 < /dev/null &
  echo "$!" > .runtime/vite.pid
fi
for attempt in {1..30}; do
  if curl --fail --silent http://127.0.0.1:5173/ | rg --quiet 'id="root"'; then
    printf 'Interface de desenvolvimento respondeu corretamente.\n'
    exit 0
  fi
  sleep 1
done
cat .runtime/vite.log
exit 1
