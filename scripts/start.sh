#!/bin/bash
set -euo pipefail

# =============================================================================
# 部门目标管理系统 — 启动脚本
# =============================================================================
# 用法:
#   ./scripts/start.sh              # 前台运行
#   ./scripts/start.sh --daemon     # 后台运行 (nohup)
#   ./scripts/start.sh --stop       # 停止后台进程
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
PID_FILE="$APP_DIR/.server.pid"
LOG_FILE="$APP_DIR/server.log"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC}  $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

start_foreground() {
  cd "$APP_DIR"
  log_info "Starting server on http://localhost:8888"
  log_info "Press Ctrl+C to stop"
  node dist/main.js
}

start_daemon() {
  cd "$APP_DIR"
  if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2> /dev/null; then
    log_warn "Server already running (PID: $(cat "$PID_FILE"))"
    exit 0
  fi

  nohup node dist/main.js > "$LOG_FILE" 2>&1 &
  echo $! > "$PID_FILE"
  sleep 2

  if kill -0 "$(cat "$PID_FILE")" 2> /dev/null; then
    log_info "Server started in background (PID: $(cat "$PID_FILE"))"
    log_info "Logs: $LOG_FILE"
    log_info "Health: curl http://localhost:8888/api/health"
  else
    log_error "Server failed to start"
    rm -f "$PID_FILE"
    exit 1
  fi
}

stop_daemon() {
  if [ ! -f "$PID_FILE" ]; then
    log_warn "No PID file found. Server may not be running."
    exit 0
  fi

  local pid
  pid=$(cat "$PID_FILE")
  if kill -0 "$pid" 2> /dev/null; then
    log_info "Stopping server (PID: $pid)..."
    kill "$pid"
    rm -f "$PID_FILE"
    log_info "Server stopped"
  else
    log_warn "Server not running (stale PID file removed)"
    rm -f "$PID_FILE"
  fi
}

show_status() {
  if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2> /dev/null; then
    log_info "Server is running (PID: $(cat "$PID_FILE"))"
    curl -sf http://localhost:8888/api/health && log_info "Health check: OK" || log_warn "Health check: FAIL"
  else
    log_warn "Server is not running"
  fi
}

case "${1:-}" in
  --daemon | -d)
    start_daemon
    ;;
  --stop | -s)
    stop_daemon
    ;;
  --status)
    show_status
    ;;
  --help | -h)
    echo "Usage: $0 [--daemon | --stop | --status | --help]"
    echo ""
    echo "Options:"
    echo "  (none)     Start server in foreground"
    echo "  --daemon   Start server in background"
    echo "  --stop     Stop background server"
    echo "  --status   Check server status"
    echo "  --help     Show this help"
    ;;
  *)
    start_foreground
    ;;
esac
