#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
interval="${WATCH_INTERVAL:-5}"

echo "Watching documentation every ${interval}s. Press Ctrl+C to stop."

while true; do
  echo
  date '+%Y-%m-%d %H:%M:%S'
  if "$script_dir/doc-check-local.sh"; then
    echo "doc-check passed"
  else
    echo "doc-check failed; continuing watch loop"
  fi
  sleep "$interval"
done
