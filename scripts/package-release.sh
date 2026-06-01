#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${APP_NAME:-dogsquard}"
OUT_DIR="${OUT_DIR:-dist}"
BUILD_TIME_UTC="${BUILD_TIME_UTC:-$(date -u +"%Y-%m-%dT%H:%M:%SZ")}"

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  GIT_SHA="${GIT_SHA:-$(git rev-parse --short=12 HEAD)}"
else
  GIT_SHA="${GIT_SHA:-unknown}"
fi

timestamp="$(date -u +"%Y%m%d%H%M%S")"
release_id="${RELEASE_ID:-${timestamp}-${GIT_SHA}}"
work_dir="${OUT_DIR}/release-${release_id}"
release_dir="${work_dir}/release"
artifact="${OUT_DIR}/${APP_NAME}-${release_id}.tar.gz"

echo "Packaging ${APP_NAME} release ${release_id}"
echo "Output artifact: ${artifact}"

rm -rf "$work_dir"
mkdir -p "${release_dir}/backend" "${release_dir}/frontend" "${release_dir}/scripts"

echo "Building backend binary..."
(
  cd backend
  CGO_ENABLED=0 go build -trimpath -o "../${release_dir}/backend/${APP_NAME}-server" ./cmd/server
)

echo "Installing frontend dependencies and building frontend assets..."
(
  cd frontend
  npm install
  npm run build
)

cp -R frontend/dist "${release_dir}/frontend/dist"

cat > "${release_dir}/manifest.txt" <<EOF
app_name=${APP_NAME}
release_id=${release_id}
git_sha=${GIT_SHA}
build_time_utc=${BUILD_TIME_UTC}
backend_binary=backend/${APP_NAME}-server
frontend_dist=frontend/dist
backend_cgo_enabled=false
secrets_included=false
note=no secrets, .git, node_modules, or local environment files are included
EOF

cat > "${release_dir}/README.txt" <<EOF
${APP_NAME} release artifact

This artifact contains the Dogsquard example app backend binary and frontend static assets.
It does not include secrets, .git, node_modules, or local environment files.

Backend binary:
  backend/${APP_NAME}-server

Frontend assets:
  frontend/dist/
EOF

cat > "${release_dir}/scripts/remote-start.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${APP_NAME:-dogsquard}"
HTTP_ADDR="${HTTP_ADDR:-127.0.0.1:18080}"

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
release_dir="$(cd "${script_dir}/.." && pwd)"
binary="${release_dir}/backend/${APP_NAME}-server"

if [[ ! -x "$binary" ]]; then
  echo "Missing executable backend binary: $binary" >&2
  exit 1
fi

echo "Starting ${APP_NAME} backend at ${HTTP_ADDR}"
exec env HTTP_ADDR="$HTTP_ADDR" "$binary"
EOF
chmod +x "${release_dir}/scripts/remote-start.sh"

echo "Creating tar.gz artifact..."
mkdir -p "$OUT_DIR"
tar -C "$work_dir" \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.env.local' \
  -czf "$artifact" release

echo "PASS: release artifact created at ${artifact}"
echo "$artifact"
