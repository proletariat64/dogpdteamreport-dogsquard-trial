#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE' >&2
Usage:
  scripts/server-preflight.sh [--deep] <ssh-target>

Examples:
  scripts/server-preflight.sh us.hermes
  scripts/server-preflight.sh cn.ant
  scripts/server-preflight.sh --deep us.hermes

This script performs read-only discovery through the local SSH config.
USAGE
}

deep=0
if [[ "${1:-}" == "--deep" ]]; then
  deep=1
  shift
fi

target="${1:-}"
if [[ -z "$target" ]]; then
  usage
  exit 2
fi

if [[ "$#" -gt 1 ]]; then
  usage
  exit 2
fi

echo "Server preflight target: $target"
echo "Mode: $([[ "$deep" -eq 1 ]] && echo deep || echo standard)"
echo

ssh "$target" 'bash -s' -- "$deep" <<'REMOTE'
set -euo pipefail

deep="${1:-0}"

section() {
  printf '\n== %s ==\n' "$1"
}

run_optional() {
  local label="$1"
  shift
  section "$label"
  if "$@" 2>&1; then
    return 0
  fi
  echo "WARN: command failed or is unavailable: $*"
}

has_cmd() {
  command -v "$1" >/dev/null 2>&1
}

section "Identity"
run_optional "hostname" hostname
run_optional "uname" uname -a
run_optional "uptime" uptime
run_optional "current user" whoami

section "Disk"
run_optional "df -h" df -h

section "Docker"
if has_cmd docker; then
  echo "docker: present ($(docker --version 2>/dev/null || true))"
  run_optional "docker ps" docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
else
  echo "docker: not found"
fi

section "Docker Compose"
if docker compose version >/dev/null 2>&1; then
  echo "docker compose: present ($(docker compose version 2>/dev/null || true))"
  run_optional "docker compose ls" docker compose ls
elif has_cmd docker-compose; then
  echo "docker-compose: present ($(docker-compose --version 2>/dev/null || true))"
  run_optional "docker-compose ps list" docker-compose ps
else
  echo "docker compose: not found"
fi

section "Reverse Proxy Commands"
for cmd in nginx caddy traefik; do
  if has_cmd "$cmd"; then
    echo "$cmd: present ($(command -v "$cmd"))"
  else
    echo "$cmd: not found"
  fi
done

section "systemctl"
if has_cmd systemctl; then
  echo "systemctl: present"
else
  echo "systemctl: not found"
fi

section "Listening TCP Ports"
if has_cmd ss; then
  ss -ltnp 2>/dev/null || ss -ltn
else
  echo "ss: not found"
fi

section "Common Web Port Probe"
if has_cmd ss; then
  for port in 80 443 8080 18080 4173; do
    if ss -ltn "( sport = :$port )" 2>/dev/null | tail -n +2 | grep -q .; then
      echo "port $port: listening"
    else
      echo "port $port: not listening or not visible"
    fi
  done
else
  echo "Skipping port probe because ss is unavailable."
fi

if [[ "$deep" -eq 1 ]]; then
  section "Deep Read-Only Discovery Warning"
  echo "Deep mode may expose sensitive paths, domains, or service names."
  echo "Do not paste raw deep output into committed docs."

  if has_cmd nginx; then
    run_optional "nginx version" nginx -v
  fi
  if has_cmd caddy; then
    run_optional "caddy version" caddy version
  fi
  if has_cmd traefik; then
    run_optional "traefik version" traefik version
  fi
  if has_cmd systemctl; then
    run_optional "systemctl list nginx/caddy/traefik units" systemctl list-units --type=service --no-pager 'nginx*' 'caddy*' 'traefik*'
  fi
fi

section "Preflight Complete"
echo "Read-only discovery finished. No services were restarted and no config files were modified."
REMOTE
