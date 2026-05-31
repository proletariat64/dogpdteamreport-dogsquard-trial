# 部署与运维方案

> 版本：v1.0
> 日期：2026-05-20

---

## 一、运行环境要求

| 项目 | 最低要求 | 推荐 |
|---|---|---|
| 操作系统 | Windows 10 / Linux / macOS | Linux (Ubuntu 22.04 LTS) |
| Node.js | 20.0.0 | 20.x LTS |
| 内存 | 512 MB | 1 GB |
| 磁盘 | 100 MB（含数据） | 1 GB（预留备份空间） |
| 网络 | 内网可达 | 内网静态 IP |

---

## 二、首次部署流程

### 2.1 下载与安装

```bash
# 1. 上传项目到服务器
scp -r dogpdteamreport/ user@server:/opt/
ssh user@server "cd /opt/dogpdteamreport && npm ci --production"

# 2. 创建数据目录
mkdir -p /opt/dogpdteamreport/data/backups

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 设置实际端口和路径
```

### 2.2 初始化数据库

```bash
# 执行迁移脚本
npm run migrate

# （可选）导入现有数据
npm run seed -- --file=./data/data.json
```

### 2.3 启动服务

**开发模式**：
```bash
npm run dev
```

**生产模式（推荐）**：
```bash
npm run build
npm start
```

**使用 pm2 守护进程**：
```bash
npm install -g pm2
pm2 start dist/main.js --name "dogpdteamreport"
pm2 save
pm2 startup
```

---

## 三、备份策略

### 3.1 自动备份（推荐）

```bash
# 添加到 crontab
crontab -e

# 每日凌晨 2 点备份
0 2 * * * cd /opt/dogpdteamreport && npm run backup

# 保留最近 30 天备份
0 3 * * * find /opt/dogpdteamreport/data/backups -name "*.db" -mtime +30 -delete
```

### 3.2 备份脚本逻辑 (`scripts/backup.ts`)

```typescript
// 1. 检查数据库文件存在
// 2. 生成备份文件名：app-YYYYMMDD-HHmmss.db
// 3. cp ./data/app.db ./data/backups/app-YYYYMMDD-HHmmss.db
// 4. 同时生成 JSON 导出作为冗余备份
// 5. 清理超过保留期限的旧备份
```

### 3.3 手动备份

```bash
# 方式一：复制数据库文件
cp data/app.db data/backups/app-manual-$(date +%Y%m%d-%H%M%S).db

# 方式二：使用脚本
npm run backup

# 方式三：导出 JSON
npm run export > backup-$(date +%Y%m%d).json
```

### 3.4 恢复备份

```bash
# 1. 停止服务
pm2 stop dogpdteamreport

# 2. 替换数据库文件
cp data/backups/app-20260520-020000.db data/app.db

# 3. 重启服务
pm2 start dogpdteamreport
```

---

## 四、Nginx 反向代理（推荐）

```nginx
server {
    listen 80;
    server_name dogpd.local;

    location / {
        proxy_pass http://127.0.0.1:8888;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 五、升级流程

```bash
# 1. 备份当前数据
npm run backup

# 2. 拉取新版本代码
git pull origin main

# 3. 安装依赖
npm ci --production

# 4. 构建
npm run build

# 5. 执行增量迁移
npm run migrate

# 6. 重启服务
pm2 restart dogpdteamreport
```

---

## 六、故障排查

| 现象 | 排查步骤 |
|---|---|
| 服务无法启动 | 检查 `PORT` 是否被占用；检查 `DB_PATH` 目录是否有写入权限 |
| 数据库写入失败 | 检查磁盘空间；检查文件权限；确认 WAL 文件未被意外删除 |
| 数据丢失 | 立即停止服务，检查 `data/backups/` 目录，执行恢复流程 |
| 前端无法加载 | 检查 `www-root/` 目录是否存在；检查静态文件服务配置 |

---

## 七、环境变量参考

| 变量名 | 默认值 | 说明 |
|---|---|---|
| `PORT` | `8888` | HTTP 服务端口 |
| `NODE_ENV` | `development` | 运行环境 |
| `DB_PATH` | `./data/app.db` | SQLite 数据库文件路径 |
| `DB_WAL` | `true` | 是否启用 WAL 模式 |
| `DB_BACKUP_DIR` | `./data/backups` | 备份文件存放目录 |
| `LOG_LEVEL` | `info` | 日志级别 |
| `BASIC_AUTH_USER` | — | 基础认证用户名（可选） |
| `BASIC_AUTH_PASS` | — | 基础认证密码（可选） |
