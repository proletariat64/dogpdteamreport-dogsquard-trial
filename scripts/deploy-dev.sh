#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${APP_NAME:-dogsquard}"
HOST="${HOST:-}"
DRY_RUN="${DRY_RUN:-true}"
DEPLOY_ROOT="${DEPLOY_ROOT:-/opt/dogsquard-dev}"
REMOTE_ARTIFACT_DIR="${REMOTE_ARTIFACT_DIR:-/tmp}"
ARTIFACT="${ARTIFACT:-}"
SSH_USER="${SSH_USER:-}"
SSH_KEY_FILE="${SSH_KEY_FILE:-}"
SSH_OPTS="${SSH_OPTS:-}"

usage() {
  cat <<'USAGE' >&2
Usage:
  make deploy-dev-dry-run HOST=cn.ant DEPLOY_ROOT=~/apps/dogsquard-dev
  make deploy-dev HOST=cn.ant DRY_RUN=false DEPLOY_ROOT=~/apps/dogsquard-dev

Environment:
  HOST                 Required SSH target from local SSH config.
  DRY_RUN              Defaults to true. Set false for an actual deploy.
  DEPLOY_ROOT          Defaults to /opt/dogsquard-dev. Prefer a writable path for manual testing.
  REMOTE_ARTIFACT_DIR  Defaults to /tmp.
  ARTIFACT             Optional local tar.gz. If omitted, scripts/package-release.sh runs first.
  SSH_USER             Optional remote SSH user. If set, connects to SSH_USER@HOST.
  SSH_KEY_FILE         Optional SSH private key path.
  SSH_OPTS             Optional extra ssh/scp options.

This wrapper uploads an artifact and runs scripts/remote-deploy.sh over SSH.
It does not edit reverse proxy config, restart services, use sudo, or run Docker.
USAGE
}

if [[ -z "$HOST" ]]; then
  usage
  exit 2
fi

case "$DRY_RUN" in
  true|false) ;;
  *)
    echo "DRY_RUN must be true or false; got: $DRY_RUN" >&2
    exit 2
    ;;
esac

if [[ -z "$ARTIFACT" ]]; then
  echo "No ARTIFACT provided; packaging release first."
  package_log="$(mktemp)"
  scripts/package-release.sh | tee "$package_log"
  ARTIFACT="$(tail -n 1 "$package_log")"
  rm -f "$package_log"
fi

if [[ ! -f "$ARTIFACT" ]]; then
  echo "Local artifact does not exist: $ARTIFACT" >&2
  exit 1
fi

artifact_name="$(basename "$ARTIFACT")"
remote_artifact="${REMOTE_ARTIFACT_DIR%/}/${artifact_name}"
ssh_target="$HOST"
if [[ -n "$SSH_USER" ]]; then
  ssh_target="${SSH_USER}@${HOST}"
fi

ssh_args=()
if [[ -n "$SSH_KEY_FILE" ]]; then
  ssh_args+=("-i" "$SSH_KEY_FILE")
fi
if [[ -n "$SSH_OPTS" ]]; then
  read -r -a extra_ssh_args <<< "$SSH_OPTS"
  ssh_args+=("${extra_ssh_args[@]}")
fi

quote() {
  printf "%q" "$1"
}

echo "Dev deploy wrapper"
echo "HOST=${HOST}"
echo "APP_NAME=${APP_NAME}"
echo "DEPLOY_ROOT=${DEPLOY_ROOT}"
echo "DRY_RUN=${DRY_RUN}"
echo "LOCAL_ARTIFACT=${ARTIFACT}"
echo "REMOTE_ARTIFACT=${remote_artifact}"
if [[ -n "$SSH_USER" ]]; then
  echo "SSH_USER=${SSH_USER}"
fi
if [[ -n "$SSH_KEY_FILE" ]]; then
  echo "SSH_KEY_FILE=<provided>"
fi
echo
echo "Safety boundaries:"
echo "- no reverse proxy edits"
echo "- no service restarts"
echo "- no multica operations"
echo "- no sudo"
echo

echo "Uploading artifact to ${ssh_target}:${remote_artifact}"
scp "${ssh_args[@]}" "$ARTIFACT" "${ssh_target}:${remote_artifact}"

echo "Running remote deploy script on ${ssh_target}"
ssh "${ssh_args[@]}" "$ssh_target" \
  "APP_NAME=$(quote "$APP_NAME") DEPLOY_ROOT=$(quote "$DEPLOY_ROOT") ARTIFACT=$(quote "$remote_artifact") DRY_RUN=$(quote "$DRY_RUN") bash -s" \
  < scripts/remote-deploy.sh

echo "PASS: dev deploy wrapper completed for ${HOST}."
