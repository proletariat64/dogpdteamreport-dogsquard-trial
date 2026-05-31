#!/bin/bash
set -euo pipefail

# =============================================================================
# 部门目标管理系统 — 本地构建发布包
# =============================================================================
# 用法:
#   ./scripts/build-release.sh [VERSION]
#
# 示例:
#   ./scripts/build-release.sh v2.0.0
# =============================================================================

VERSION="${1:-$(node -p "require('./package.json').version")}"
RELEASE_DIR="release"
PACKAGE_DIR="$RELEASE_DIR/dogpdteamreport-linux"
TARBALL="$RELEASE_DIR/dogpdteamreport-linux.tar.gz"

echo "========================================"
echo " 构建发布包: $VERSION"
echo "========================================"

# 1. Clean
echo "[1/5] 清理..."
rm -rf "$RELEASE_DIR"
mkdir -p "$PACKAGE_DIR/scripts"

# 2. Build
echo "[2/5] 编译 TypeScript..."
npm run build

# 3. Package
echo "[3/5] 打包..."
cp -r dist www ddd package.json package-lock.json .env.example README.md "$PACKAGE_DIR/"
cp scripts/install.sh scripts/start.sh "$PACKAGE_DIR/scripts/"
chmod +x "$PACKAGE_DIR/scripts/"*.sh

# 4. Create tarball
echo "[4/5] 创建 tar.gz..."
cd "$RELEASE_DIR"
tar -czf dogpdteamreport-linux.tar.gz dogpdteamreport-linux
cd ..

# 5. Verify
echo "[5/5] 验证..."
echo ""
echo "文件清单:"
ls -lh "$PACKAGE_DIR/"
echo ""
echo "发布包: $TARBALL"
ls -lh "$TARBALL"
echo ""
echo "安装测试:"
echo "  mkdir -p /tmp/dogpd-test && tar -xzf $TARBALL -C /tmp/dogpd-test --strip-components=1"
echo "  cd /tmp/dogpd-test && npm ci --production"
echo ""
echo "========================================"
echo " 构建完成: $TARBALL"
echo "========================================"
