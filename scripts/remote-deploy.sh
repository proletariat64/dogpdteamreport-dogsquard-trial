#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${APP_NAME:-dogsquard}"
DEPLOY_ROOT="${DEPLOY_ROOT:-/opt/dogsquard-dev}"
ARTIFACT="${ARTIFACT:-}"
DRY_RUN="${DRY_RUN:-true}"
RELEASE_ID="${RELEASE_ID:-}"
PRUNE_OLD_RELEASES="${PRUNE_OLD_RELEASES:-false}"
KEEP_RELEASES="${KEEP_RELEASES:-5}"

usage() {
  cat <<'USAGE' >&2
Usage:
  ARTIFACT=/tmp/dogsquard.tar.gz DEPLOY_ROOT=~/apps/dogsquard-dev DRY_RUN=true scripts/remote-deploy.sh

Required:
  ARTIFACT      Path to release tar.gz on the remote host.

Optional:
  APP_NAME      Defaults to dogsquard.
  DEPLOY_ROOT   Defaults to /opt/dogsquard-dev. Use a writable path if /opt is not prepared.
  DRY_RUN       Defaults to true. Set DRY_RUN=false to modify the deploy root.
  RELEASE_ID    Defaults to artifact basename plus UTC timestamp.

This script never edits reverse proxy config, restarts services, runs Docker, or uses sudo.
USAGE
}

if [[ -z "$ARTIFACT" ]]; then
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

case "$DEPLOY_ROOT" in
  "~")
    DEPLOY_ROOT="$HOME"
    ;;
  "~/"*)
    DEPLOY_ROOT="$HOME/${DEPLOY_ROOT#"~/"}"
    ;;
esac

if [[ ! -f "$ARTIFACT" ]]; then
  echo "Artifact does not exist on remote host: $ARTIFACT" >&2
  exit 1
fi

if [[ -z "$RELEASE_ID" ]]; then
  artifact_base="$(basename "$ARTIFACT" .tar.gz)"
  RELEASE_ID="${artifact_base}-$(date -u +"%Y%m%d%H%M%S")"
fi

releases_dir="${DEPLOY_ROOT}/releases"
shared_dir="${DEPLOY_ROOT}/shared"
logs_dir="${DEPLOY_ROOT}/logs"
release_dir="${releases_dir}/${RELEASE_ID}"
current_link="${DEPLOY_ROOT}/current"

run_cmd() {
  printf '+'
  printf ' %q' "$@"
  printf '\n'
  if [[ "$DRY_RUN" == "false" ]]; then
    "$@"
  fi
}

echo "Remote deploy plan"
echo "APP_NAME=${APP_NAME}"
echo "DEPLOY_ROOT=${DEPLOY_ROOT}"
echo "ARTIFACT=${ARTIFACT}"
echo "RELEASE_ID=${RELEASE_ID}"
echo "DRY_RUN=${DRY_RUN}"
echo
echo "Safety boundaries:"
echo "- no reverse proxy edits"
echo "- no nginx/caddy/traefik restart"
echo "- no multica operations"
echo "- no Docker commands"
echo "- no sudo"
echo

if [[ "$DRY_RUN" == "true" ]]; then
  echo "Dry-run mode: no directories, files, or symlinks will be changed."
  echo
fi

run_cmd mkdir -p "$releases_dir" "$shared_dir" "$logs_dir"

if [[ "$DRY_RUN" == "false" && -e "$release_dir" ]]; then
  echo "Release directory already exists: $release_dir" >&2
  exit 1
fi

run_cmd mkdir -p "$release_dir"

echo "+ tar -xzf $(printf '%q' "$ARTIFACT") -C $(printf '%q' "$release_dir")"
if [[ "$DRY_RUN" == "false" ]]; then
  tar -xzf "$ARTIFACT" -C "$release_dir"
fi

tmp_link="${DEPLOY_ROOT}/.current-${RELEASE_ID}"
run_cmd ln -sfn "releases/${RELEASE_ID}" "$tmp_link"
run_cmd mv -Tf "$tmp_link" "$current_link"

if [[ "$PRUNE_OLD_RELEASES" == "true" ]]; then
  echo "Prune mode is enabled; keeping newest ${KEEP_RELEASES} releases."
  if [[ "$DRY_RUN" == "false" ]]; then
    find "$releases_dir" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' \
      | sort -rn \
      | awk -v keep="$KEEP_RELEASES" 'NR > keep {print $2}' \
      | xargs -r rm -rf --
  else
    echo "Dry-run: old releases would be pruned only when DRY_RUN=false."
  fi
else
  echo "Old releases are retained. Set PRUNE_OLD_RELEASES=true to prune explicitly."
fi

echo
echo "Rollback hint:"
echo "  ln -sfn releases/<previous-release-id> ${DEPLOY_ROOT}/.rollback-current"
echo "  mv -Tf ${DEPLOY_ROOT}/.rollback-current ${DEPLOY_ROOT}/current"
echo
if [[ "$DRY_RUN" == "true" ]]; then
  echo "PASS: remote deploy plan completed for ${APP_NAME}."
else
  echo "PASS: remote deploy completed for ${APP_NAME}."
fi
