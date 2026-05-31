#!/bin/bash
set -euo pipefail

# =============================================================================
# 部门目标管理系统 — Linux 安装/升级脚本
# =============================================================================
# 用法:
#   全新安装:
#     curl -fsSL https://raw.githubusercontent.com/proletariat64/dogpdteamreport/main/scripts/install.sh | bash
#
#   指定安装目录:
#     INSTALL_DIR=/opt/dogpdteamreport bash install.sh
#
#   指定版本:
#     VERSION=v2.0.0 bash install.sh
# =============================================================================

REPO="proletariat64/dogpdteamreport"
INSTALL_DIR="${INSTALL_DIR:-$HOME/dogpdteamreport}"
VERSION="${VERSION:-latest}"
SERVICE_NAME="dogpdteamreport"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info()  { echo -e "${GREEN}[INFO]${NC}  $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ---------------------------------------------------------------------------
# Check prerequisites
# ---------------------------------------------------------------------------
check_prereqs() {
  if ! command -v node &> /dev/null; then
    log_error "Node.js not found. Please install Node.js >= 20 first."
    log_info "  Ubuntu/Debian: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs"
    exit 1
  fi

  local node_version
  node_version=$(node --version | sed 's/v//')
  local major_version
  major_version=$(echo "$node_version" | cut -d. -f1)
  if [ "$major_version" -lt 20 ]; then
    log_error "Node.js >= 20 required, found $node_version"
    exit 1
  fi

  log_info "Node.js $node_version ✓"
}

# ---------------------------------------------------------------------------
# Resolve version
# ---------------------------------------------------------------------------
resolve_version() {
  if [ "$VERSION" = "latest" ]; then
    log_info "Fetching latest release version..."
    VERSION=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
    if [ -z "$VERSION" ]; then
      log_error "Failed to fetch latest version"
      exit 1
    fi
  fi
  log_info "Installing version: $VERSION"
}

# ---------------------------------------------------------------------------
# Backup existing data (CRITICAL: never lose the database)
# ---------------------------------------------------------------------------
backup_data() {
  if [ -f "$INSTALL_DIR/data/app.db" ]; then
    local backup_dir="$INSTALL_DIR/backups"
    mkdir -p "$backup_dir"
    local timestamp
    timestamp=$(date +%Y%m%d_%H%M%S)
    cp "$INSTALL_DIR/data/app.db" "$backup_dir/app.db.$timestamp"
    log_info "Database backed up to: $backup_dir/app.db.$timestamp"
  fi
}

# ---------------------------------------------------------------------------
# Preserve runtime data before extraction
# ---------------------------------------------------------------------------
preserve_data() {
  PRESERVE_DIR=$(mktemp -d)
  if [ -d "$INSTALL_DIR/data" ]; then
    cp -r "$INSTALL_DIR/data" "$PRESERVE_DIR/"
    log_info "Existing data preserved to temp: $PRESERVE_DIR/data"
  fi
}

# ---------------------------------------------------------------------------
# Restore runtime data after extraction
# ---------------------------------------------------------------------------
restore_data() {
  if [ -d "$PRESERVE_DIR/data" ]; then
    mkdir -p "$INSTALL_DIR/data"
    # Restore database if it existed
    if [ -f "$PRESERVE_DIR/data/app.db" ]; then
      cp "$PRESERVE_DIR/data/app.db" "$INSTALL_DIR/data/app.db"
      log_info "Database restored (NOT overwritten)"
    fi
    # Restore edit lock if it existed
    if [ -f "$PRESERVE_DIR/data/edit-lock.json" ]; then
      cp "$PRESERVE_DIR/data/edit-lock.json" "$INSTALL_DIR/data/edit-lock.json"
    fi
    # Restore backups dir if it existed
    if [ -d "$PRESERVE_DIR/data/backups" ]; then
      cp -r "$PRESERVE_DIR/data/backups" "$INSTALL_DIR/data/"
    fi
    # Clean up temp
    rm -rf "$PRESERVE_DIR"
  fi
}

# ---------------------------------------------------------------------------
# Download and extract release
# ---------------------------------------------------------------------------
download_release() {
  local url="https://github.com/$REPO/releases/download/$VERSION/dogpdteamreport-linux.tar.gz"
  local tmpdir
  tmpdir=$(mktemp -d)

  log_info "Downloading release from GitHub..."
  if ! curl -fsSL "$url" -o "$tmpdir/release.tar.gz"; then
    log_error "Download failed: $url"
    rm -rf "$tmpdir"
    exit 1
  fi

  log_info "Extracting to $INSTALL_DIR..."
  mkdir -p "$INSTALL_DIR"
  tar -xzf "$tmpdir/release.tar.gz" -C "$INSTALL_DIR" --strip-components=1
  rm -rf "$tmpdir"
}

# ---------------------------------------------------------------------------
# Install production dependencies
# ---------------------------------------------------------------------------
install_deps() {
  log_info "Installing production dependencies..."
  cd "$INSTALL_DIR"
  npm ci --production --silent
}

# ---------------------------------------------------------------------------
# Setup environment file
# ---------------------------------------------------------------------------
setup_env() {
  if [ ! -f "$INSTALL_DIR/.env" ]; then
    cp "$INSTALL_DIR/.env.example" "$INSTALL_DIR/.env"
    log_info "Created .env from .env.example"
    log_warn "Please edit $INSTALL_DIR/.env to configure your environment"
  else
    log_info ".env already exists — preserving"
  fi
}

# ---------------------------------------------------------------------------
# Create systemd service (optional, if running as root)
# ---------------------------------------------------------------------------
setup_systemd() {
  if [ "$EUID" -ne 0 ]; then
    log_info "Skipping systemd setup (not root). Run with sudo to create service."
    return
  fi

  log_info "Creating systemd service: $SERVICE_NAME"

  cat > "/etc/systemd/system/$SERVICE_NAME.service" << EOF
[Unit]
Description=部门目标管理系统
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR
ExecStart=/usr/bin/node $INSTALL_DIR/dist/main.js
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable "$SERVICE_NAME"
  log_info "Systemd service created. Manage with:"
  log_info "  sudo systemctl start $SERVICE_NAME"
  log_info "  sudo systemctl stop $SERVICE_NAME"
  log_info "  sudo systemctl status $SERVICE_NAME"
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
  log_info "========================================"
  log_info " 部门目标管理系统 — 安装/升级脚本"
  log_info "========================================"

  check_prereqs
  resolve_version

  local is_upgrade=false
  if [ -d "$INSTALL_DIR/dist" ]; then
    is_upgrade=true
    log_warn "Existing installation detected at $INSTALL_DIR"
    log_info "This will be an UPGRADE. Database will be preserved."
  fi

  if [ "$is_upgrade" = true ]; then
    backup_data
    preserve_data
  fi

  download_release

  if [ "$is_upgrade" = true ]; then
    restore_data
  else
    mkdir -p "$INSTALL_DIR/data"
  fi

  install_deps
  setup_env

  if [ "$EUID" -eq 0 ]; then
    setup_systemd
  fi

  log_info "========================================"
  log_info " Installation complete!"
  log_info "========================================"
  log_info "Directory:  $INSTALL_DIR"
  log_info "Database:   $INSTALL_DIR/data/app.db"
  log_info "Config:     $INSTALL_DIR/.env"

  if [ "$EUID" -eq 0 ] && command -v systemctl &> /dev/null; then
    log_info ""
    log_info "Start server:"
    log_info "  sudo systemctl start $SERVICE_NAME"
    log_info "View logs:"
    log_info "  sudo journalctl -u $SERVICE_NAME -f"
  else
    log_info ""
    log_info "Start server:"
    log_info "  cd $INSTALL_DIR && npm start"
  fi
}

main "$@"
