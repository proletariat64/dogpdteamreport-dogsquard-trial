#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${APP_NAME:-dogsquard}"
DEPLOY_ROOT="${DEPLOY_ROOT:-~/apps/dogsquard-dev}"
BACKEND_HOST="${BACKEND_HOST:-127.0.0.1}"
BACKEND_PORT="${BACKEND_PORT:-18080}"
FRONTEND_HOST="${FRONTEND_HOST:-127.0.0.1}"
FRONTEND_PORT="${FRONTEND_PORT:-14173}"
LOG_LINES="${LOG_LINES:-80}"
TARGET_RELEASE="${TARGET_RELEASE:-}"
RESTART_AFTER_ROLLBACK="${RESTART_AFTER_ROLLBACK:-false}"

case "$DEPLOY_ROOT" in
  "~")
    DEPLOY_ROOT="$HOME"
    ;;
  "~/"*)
    DEPLOY_ROOT="$HOME/${DEPLOY_ROOT#"~/"}"
    ;;
esac

LOG_DIR="${LOG_DIR:-${DEPLOY_ROOT}/logs}"
RUN_DIR="${RUN_DIR:-${DEPLOY_ROOT}/shared/run}"

current_dir="${DEPLOY_ROOT}/current"
releases_dir="${DEPLOY_ROOT}/releases"
release_dir="${current_dir}/release"
backend_binary="${release_dir}/backend/${APP_NAME}-server"
frontend_dist="${release_dir}/frontend/dist"
backend_pid_file="${RUN_DIR}/backend.pid"
frontend_pid_file="${RUN_DIR}/frontend.pid"
backend_log="${LOG_DIR}/backend.log"
frontend_log="${LOG_DIR}/frontend.log"

usage() {
  cat <<'USAGE' >&2
Usage:
  scripts/remote-runtime.sh start|stop|status|restart|health|logs|diagnose|rollback [backend|frontend]

Environment:
  APP_NAME                Defaults to dogsquard.
  DEPLOY_ROOT             Defaults to ~/apps/dogsquard-dev.
  BACKEND_HOST            Defaults to 127.0.0.1.
  BACKEND_PORT            Defaults to 18080.
  FRONTEND_HOST           Defaults to 127.0.0.1.
  FRONTEND_PORT           Defaults to 14173.
  LOG_DIR                 Defaults to $DEPLOY_ROOT/logs.
  RUN_DIR                 Defaults to $DEPLOY_ROOT/shared/run.
  LOG_LINES               Defaults to 80.
  TARGET_RELEASE          Required for rollback.
  RESTART_AFTER_ROLLBACK  Defaults to false.

This script manages only Dogsquard pid files under RUN_DIR.
It does not use sudo, Docker, systemd, reverse proxy config, or multica services.
USAGE
}

action="${1:-}"
component="${2:-}"
if [[ -z "$action" ]]; then
  usage
  exit 2
fi

pid_value() {
  local pid_file="$1"
  if [[ -f "$pid_file" ]]; then
    cat "$pid_file" 2>/dev/null || true
  fi
}

is_alive() {
  local pid_file="$1"
  [[ -f "$pid_file" ]] || return 1
  local pid
  pid="$(pid_value "$pid_file")"
  [[ "$pid" =~ ^[0-9]+$ ]] || return 1
  kill -0 "$pid" >/dev/null 2>&1
}

pid_status() {
  local pid_file="$1"
  if is_alive "$pid_file"; then
    echo "running pid $(pid_value "$pid_file")"
  elif [[ -f "$pid_file" ]]; then
    echo "stale pid $(pid_value "$pid_file")"
  else
    echo "stopped"
  fi
}

remove_stale_pid() {
  local label="$1"
  local pid_file="$2"
  if [[ -f "$pid_file" ]] && ! is_alive "$pid_file"; then
    echo "$label: removing stale pid file $(pid_value "$pid_file")"
    rm -f "$pid_file"
  fi
}

release_problem() {
  if [[ ! -e "$current_dir" ]]; then
    echo "missing current release"
    return 0
  fi
  if [[ ! -x "$backend_binary" ]]; then
    echo "missing backend binary"
    return 0
  fi
  if [[ ! -d "$frontend_dist" ]]; then
    echo "missing frontend dist"
    return 0
  fi
  echo "ok"
}

require_release() {
  local problem
  problem="$(release_problem)"
  if [[ "$problem" != "ok" ]]; then
    echo "Release check failed: $problem" >&2
    echo "current: $current_dir" >&2
    echo "backend: $backend_binary" >&2
    echo "frontend: $frontend_dist" >&2
    exit 1
  fi
}

port_lines() {
  local port="$1"
  if command -v ss >/dev/null 2>&1; then
    ss -ltnp "( sport = :$port )" 2>/dev/null | tail -n +2 || true
  elif command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$port" -sTCP:LISTEN 2>/dev/null || true
  fi
}

port_is_listening() {
  local port="$1"
  [[ -n "$(port_lines "$port")" ]]
}

port_owned_by_pid() {
  local port="$1"
  local pid="$2"
  [[ "$pid" =~ ^[0-9]+$ ]] || return 1
  port_lines "$port" | grep -Eq "(pid=${pid},|pid=${pid}\\b|[[:space:]]${pid}[[:space:]])"
}

print_port_status() {
  local label="$1"
  local host="$2"
  local port="$3"
  echo "$label port ${host}:${port}:"
  local lines
  lines="$(port_lines "$port")"
  if [[ -n "$lines" ]]; then
    echo "$lines" | sed 's/^/  /'
  else
    echo "  not listening or not visible"
  fi
}

ensure_port_available_or_owned() {
  local label="$1"
  local host="$2"
  local port="$3"
  local pid_file="$4"

  if ! port_is_listening "$port"; then
    return 0
  fi

  if is_alive "$pid_file" && port_owned_by_pid "$port" "$(pid_value "$pid_file")"; then
    return 0
  fi

  echo "$label port ${host}:${port} is already listening and is not owned by the Dogsquard pid file." >&2
  print_port_status "$label" "$host" "$port" >&2
  echo "Refusing to start duplicate or unknown process." >&2
  return 1
}

wait_for_process() {
  local label="$1"
  local pid_file="$2"
  sleep 0.4
  if ! is_alive "$pid_file"; then
    echo "$label failed to stay running. See logs:" >&2
    case "$label" in
      backend) echo "  $backend_log" >&2 ;;
      frontend) echo "  $frontend_log" >&2 ;;
    esac
    return 1
  fi
}

start_runtime() {
  require_release
  mkdir -p "$LOG_DIR" "$RUN_DIR"
  remove_stale_pid "backend" "$backend_pid_file"
  remove_stale_pid "frontend" "$frontend_pid_file"

  ensure_port_available_or_owned "backend" "$BACKEND_HOST" "$BACKEND_PORT" "$backend_pid_file"
  ensure_port_available_or_owned "frontend" "$FRONTEND_HOST" "$FRONTEND_PORT" "$frontend_pid_file"

  if is_alive "$backend_pid_file"; then
    echo "Backend already running with pid $(pid_value "$backend_pid_file")."
  else
    echo "Starting backend on ${BACKEND_HOST}:${BACKEND_PORT}"
    nohup env HTTP_ADDR="${BACKEND_HOST}:${BACKEND_PORT}" "$backend_binary" >>"$backend_log" 2>&1 &
    echo "$!" > "$backend_pid_file"
    wait_for_process "backend" "$backend_pid_file"
  fi

  if is_alive "$frontend_pid_file"; then
    echo "Frontend already running with pid $(pid_value "$frontend_pid_file")."
  else
    if ! command -v python3 >/dev/null 2>&1; then
      echo "python3 is required to serve frontend static files in Phase 6B-4." >&2
      exit 1
    fi
    echo "Starting frontend static server on ${FRONTEND_HOST}:${FRONTEND_PORT}"
    (
      cd "$frontend_dist"
      nohup python3 -m http.server "$FRONTEND_PORT" --bind "$FRONTEND_HOST" >>"$frontend_log" 2>&1 &
      echo "$!" > "$frontend_pid_file"
    )
    wait_for_process "frontend" "$frontend_pid_file"
  fi

  echo "Backend endpoint: http://${BACKEND_HOST}:${BACKEND_PORT}/healthz"
  echo "Frontend endpoint: http://${FRONTEND_HOST}:${FRONTEND_PORT}/"
}

stop_one() {
  local label="$1"
  local pid_file="$2"

  if ! [[ -f "$pid_file" ]]; then
    echo "$label: stopped (no pid file)"
    return 0
  fi

  local pid
  pid="$(pid_value "$pid_file")"
  if [[ "$pid" =~ ^[0-9]+$ ]] && kill -0 "$pid" >/dev/null 2>&1; then
    echo "Stopping $label pid $pid"
    kill "$pid" >/dev/null 2>&1 || true
    for _ in $(seq 1 20); do
      if ! kill -0 "$pid" >/dev/null 2>&1; then
        break
      fi
      sleep 0.2
    done
    if kill -0 "$pid" >/dev/null 2>&1; then
      echo "$label pid $pid did not stop after TERM." >&2
      return 1
    fi
  else
    echo "$label: removing stale pid file ${pid:-unknown}"
  fi

  rm -f "$pid_file"
}

stop_runtime() {
  local failed=0
  stop_one "frontend" "$frontend_pid_file" || failed=1
  stop_one "backend" "$backend_pid_file" || failed=1
  return "$failed"
}

status_runtime() {
  echo "Deploy root: $DEPLOY_ROOT"
  echo "Release: $(release_problem)"
  if [[ -L "$current_dir" ]]; then
    echo "Current target: $(readlink "$current_dir")"
  elif [[ -e "$current_dir" ]]; then
    echo "Current target: present but not symlink"
  else
    echo "Current target: missing"
  fi
  echo "Backend: $(pid_status "$backend_pid_file")"
  echo "Frontend: $(pid_status "$frontend_pid_file")"
}

curl_status() {
  local url="$1"
  curl -fsS -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || true
}

health_runtime() {
  if ! command -v curl >/dev/null 2>&1; then
    echo "curl is required for runtime health checks." >&2
    exit 1
  fi

  local failed=0
  local backend_url="http://${BACKEND_HOST}:${BACKEND_PORT}/healthz"
  local frontend_url="http://${FRONTEND_HOST}:${FRONTEND_PORT}/"
  local backend_code
  local frontend_code

  echo "Backend health URL: $backend_url"
  backend_code="$(curl_status "$backend_url")"
  if [[ "$backend_code" == "200" ]]; then
    echo "PASS: backend health returned HTTP 200"
  else
    echo "FAIL: backend health returned HTTP ${backend_code:-unreachable}" >&2
    echo "Hint: backend status is $(pid_status "$backend_pid_file"); port status follows." >&2
    print_port_status "backend" "$BACKEND_HOST" "$BACKEND_PORT" >&2
    echo "Log: $backend_log" >&2
    failed=1
  fi

  echo "Frontend URL: $frontend_url"
  frontend_code="$(curl_status "$frontend_url")"
  if [[ "$frontend_code" == "200" ]]; then
    echo "PASS: frontend returned HTTP 200"
  else
    echo "FAIL: frontend returned HTTP ${frontend_code:-unreachable}" >&2
    echo "Hint: frontend status is $(pid_status "$frontend_pid_file"); port status follows." >&2
    print_port_status "frontend" "$FRONTEND_HOST" "$FRONTEND_PORT" >&2
    echo "Log: $frontend_log" >&2
    failed=1
  fi

  return "$failed"
}

tail_log() {
  local label="$1"
  local file="$2"
  echo "== $label log: $file =="
  if [[ -f "$file" ]]; then
    tail -n "$LOG_LINES" "$file"
  else
    echo "Log file is missing."
  fi
}

logs_runtime() {
  case "$component" in
    ""|"all")
      tail_log "backend" "$backend_log"
      tail_log "frontend" "$frontend_log"
      ;;
    "backend")
      tail_log "backend" "$backend_log"
      ;;
    "frontend")
      tail_log "frontend" "$frontend_log"
      ;;
    *)
      echo "Unknown logs component: $component" >&2
      echo "Use: backend, frontend, or omit component for both." >&2
      exit 2
      ;;
  esac
}

diagnose_runtime() {
  echo "== Runtime Diagnose =="
  status_runtime
  echo
  echo "Paths:"
  echo "  release_dir: $release_dir"
  echo "  backend_binary: $backend_binary"
  echo "  frontend_dist: $frontend_dist"
  echo "  run_dir: $RUN_DIR"
  echo "  log_dir: $LOG_DIR"
  echo
  echo "Layout:"
  [[ -d "$releases_dir" ]] && find "$releases_dir" -mindepth 1 -maxdepth 1 -type d -printf '  release: %f\n' 2>/dev/null | sort | tail -10 || echo "  releases directory missing"
  echo
  echo "Pid files:"
  for file in "$backend_pid_file" "$frontend_pid_file"; do
    if [[ -f "$file" ]]; then
      echo "  $file: $(pid_value "$file")"
    else
      echo "  $file: missing"
    fi
  done
  echo
  print_port_status "backend" "$BACKEND_HOST" "$BACKEND_PORT"
  print_port_status "frontend" "$FRONTEND_HOST" "$FRONTEND_PORT"
  echo
  tail_log "backend" "$backend_log" | tail -n 20
  tail_log "frontend" "$frontend_log" | tail -n 20
  echo
  if command -v curl >/dev/null 2>&1; then
    health_runtime || true
  else
    echo "curl not found; skipping health checks."
  fi
}

list_releases() {
  if [[ -d "$releases_dir" ]]; then
    find "$releases_dir" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' 2>/dev/null | sort
  fi
}

rollback_runtime() {
  if [[ -z "$TARGET_RELEASE" ]]; then
    echo "TARGET_RELEASE is required for rollback." >&2
    echo "Available releases:" >&2
    list_releases >&2
    exit 2
  fi

  local target_dir="${releases_dir}/${TARGET_RELEASE}"
  if [[ ! -d "$target_dir" ]]; then
    echo "Target release does not exist: $TARGET_RELEASE" >&2
    echo "Available releases:" >&2
    list_releases >&2
    exit 1
  fi
  if [[ ! -d "${target_dir}/release" ]]; then
    echo "Target release has no release/ directory: $target_dir" >&2
    exit 1
  fi

  mkdir -p "$DEPLOY_ROOT"
  local tmp_link="${DEPLOY_ROOT}/.rollback-current"
  ln -sfn "releases/${TARGET_RELEASE}" "$tmp_link"
  mv -Tf "$tmp_link" "$current_dir"
  echo "PASS: current now points to releases/${TARGET_RELEASE}"

  if [[ "$RESTART_AFTER_ROLLBACK" == "true" ]]; then
    stop_runtime
    start_runtime
  else
    echo "Runtime was not restarted. Set RESTART_AFTER_ROLLBACK=true to restart explicitly."
  fi
}

case "$action" in
  start)
    start_runtime
    ;;
  stop)
    stop_runtime
    ;;
  status)
    status_runtime
    ;;
  restart)
    stop_runtime
    start_runtime
    ;;
  health)
    health_runtime
    ;;
  logs)
    logs_runtime
    ;;
  diagnose)
    diagnose_runtime
    ;;
  rollback)
    rollback_runtime
    ;;
  *)
    usage
    exit 2
    ;;
esac
