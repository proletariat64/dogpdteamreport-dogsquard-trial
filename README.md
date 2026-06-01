# 部门目标与人员管理表单系统

> 产品管理信息录入系统 v2.0 — 基于 DDD 领域模型的轻量级全栈应用

## 系统概览

面向 5-10 人内网办公场景的部门管理工具。围绕**产品 → 目标 → 人员**三层结构，提供 Dashboard 下钻看板、CRUD 表单管理、全局编辑锁、数据库备份等完整功能。

| 特性 | 说明 |
|------|------|
| Dashboard | L1 产品 → L2 产品 → 人员 → 目标，逐层展开下钻，覆盖率可视化 |
| 人员管理 | 姓名/工号/职级/所在地/团队/上级/标签筛选，表头点击排序 |
| 团队管理 | 团队 + 标签关联，删除级联提示 |
| 产品管理 | L1/L2 树状层级，展开折叠，排序下拉（团队/名称/编号） |
| 目标管理 | L0(部门)/L1(产品)/L2(模块) 三级目标，多对多分解关联 |
| 标签管理 | 独立标签库，统一管理，用于标记团队和人员 |
| 编辑锁 | 全局独占写锁，同一时刻仅 1 人编辑，读操作不受限 |
| 管理后台 | 系统状态、编辑锁管理、数据库备份下载 |

## 技术栈

```
后端:  Node.js + Express + TypeScript + sql.js (WASM SQLite)
校验:  Zod
前端:  纯 HTML/CSS/JS，零框架，零构建
设计:  warm-editorial 设计语言 (cream + coral + dark navy)
测试:  Vitest + supertest，53 项集成测试
```

## 目录结构

```
├── src/
│   ├── main.ts              # 应用入口
│   ├── app.ts               # Express 工厂
│   ├── app.routes.ts        # 路由聚合 /api/*
│   ├── lib/                 # 核心库 (db, id, errors, response)
│   │   └── middleware/      # 编辑锁、全局错误处理
│   ├── organization/        # 组织上下文 (tag, team, person)
│   ├── product/             # 产品上下文 (l1, l2)
│   ├── goal/                # 目标上下文 + 关联
│   ├── dashboard/           # 透视看板 (只读聚合查询)
│   └── admin/               # 管理后台 API
├── www/                     # 前端静态文件
│   ├── index.html           # Dashboard 主页
│   ├── people.html          # 人员管理
│   ├── teams.html           # 团队管理
│   ├── products.html        # 产品管理 (树状层级)
│   ├── goals.html           # 目标管理
│   ├── tags.html            # 标签管理
│   ├── admin.html           # 管理后台
│   ├── css/style.css        # 设计系统 CSS
│   └── js/                  # 页面逻辑
├── ddd/                     # DDD 领域模型
│   ├── ddd.md               # 领域建模文档
│   ├── ddd.yaml             # 结构化领域定义
│   └── schema.sql           # 数据库 DDL (真理源)
├── spec/v1.0/               # 技术规格文档
├── test/                    # 集成测试
├── scripts/                 # 种子数据、备份、迁移脚本
└── data/                    # 运行时数据 (gitignored)
```

## 部署

| 环境 | 地址 | 说明 |
|------|------|------|
| UAT | `http://ifundaitest.inc.alipay.net:8887` | 测试验证环境 |
| 本地 | `http://localhost:8888` | 开发调试 |

UAT 服务器信息：
- SSH: `ssh ifundaitest`
- Web 根目录: `~/www`（Express 静态文件 + API 服务）
- 数据库: `~/www/data/app.db`
- 进程管理: 直接 `node dist/main.js`（配合 nohup / screen）

### 部署步骤

```bash
# 1. 构建 + 上传
npm run build
scp -r dist www package.json node_modules ifundaitest:~/www/

# 2. 启动（服务器上）
ssh ifundaitest
cd ~/www
nohup node dist/main.js > /dev/null 2>&1 &
```

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npx tsx src/main.ts
# → http://localhost:8888

# 导入种子数据 (需服务器已启动)
npx tsx scripts/seed.ts

# 运行测试
npm test
```

浏览器打开 `http://localhost:8888` 即可看到 Dashboard。

## 编辑锁

系统采用**全自动全局独占编辑锁**，保护数据一致性，防止并发写冲突。

### 工作流程

```
用户 A 首次写操作
  → 服务器自动分配锁给 A 的 IP
  → NavBar 指示灯变橙色脉冲「编辑中 (::1)」
  → A 可以继续任意写操作 (自动续期)
  → 30 分钟无操作后自动释放

用户 B 在 A 持锁期间尝试写操作
  → 服务器返回 HTTP 423
  → 弹窗提示「系统正在由 [A的IP] 编辑中」
  → B 只能等待或联系管理员
```

### 状态指示

| 指示灯 | 含义 |
|--------|------|
| 🟢 绿色 | 空闲，可编辑 |
| 🟠 橙色脉冲 | 你持有编辑锁 |
| 🔴 红色 | 他人正在编辑，你的写操作被阻塞 |

### 管理操作

访问 `/admin.html` → **编辑锁**卡片：
- 查看持有者 IP、获取时间、最后活动时间
- 点击「强制释放锁」紧急解除（如持有者异常断开）

### 技术实现

```
内存 Map<LockState> + 文件持久化 (data/edit-lock.json)
  ├── 写操作触发自动获取
  ├── 定时器每分钟检查 30 分钟超时
  ├── Admin 路由豁免锁检查
  └── GET/HEAD/OPTIONS 始终放行
```

## API 参考

基础路径: `/api`，统一响应格式:

```json
{ "success": true, "data": { ... } }
{ "success": false, "error": { "code": "...", "message": "..." } }
```

| 状态码 | 含义 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 参数校验失败 |
| 404 | 资源不存在 |
| 409 | 唯一约束冲突 |
| 423 | 编辑锁定 |
| 500 | 服务器错误 |

### 端点一览

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 健康检查 |
| GET/POST/DELETE | `/tags` | 标签 CRUD |
| PUT | `/tags/:id` | 更新标签 |
| GET/POST/PUT/DELETE | `/teams` | 团队 CRUD |
| GET/POST/PUT/DELETE | `/people` | 人员 CRUD (支持 name/teamId/location 筛选) |
| GET/POST/PUT/DELETE | `/products/l1` | L1 产品 CRUD |
| GET/POST/PUT/DELETE | `/products/l2` | L2 产品 CRUD (支持 l1Id 筛选) |
| GET/POST/PUT/DELETE | `/goals/l0` | L0 部门目标 CRUD |
| GET/POST/PUT/DELETE | `/goals/l1` | L1 产品目标 CRUD |
| GET/POST/PUT/DELETE | `/goals/l2` | L2 模块目标 CRUD |
| GET/POST/DELETE | `/goals/l0/:id/l1-goals` | L0↔L1 关联 |
| GET/POST/DELETE | `/goals/l1/:id/l2-goals` | L1↔L2 关联 |
| GET | `/dashboard` | 透视看板 (支持 teamId/location 筛选) |
| GET | `/admin/status` | 系统状态 |
| POST | `/admin/backup` | 创建备份 |
| GET | `/admin/backups` | 备份列表 |
| GET | `/admin/backup/:filename` | 下载备份 |
| DELETE | `/admin/lock` | 强制释放锁 |

## 设计系统

遵循 warm-editorial 设计语言：

| Token | 用途 |
|-------|------|
| Cream canvas `#faf9f5` | 页面底色 |
| Coral `#cc785c` | 主按钮、交互强调 |
| Dark navy `#181715` | 深色面板、数据展示 |
| Serif display | 标题 (Cormorant Garamond → 回退 Inter) |
| Humanist sans | 正文、UI 标签 (Inter) |
| JetBrains Mono | 编码、数据标识 |

## 数据库

SQLite (sql.js WASM 引擎)，启动时从 `ddd/schema.sql` 自动建表。

**10 张核心表 + 6 张关联表**：

```
tags, teams, team_tags
people, person_tags
l1_products, l2_products
l1_product_owners, l2_product_owners
person_l1_products, person_l2_products
l0_goals, l1_goals, l2_goals
l0_goal_l1_goals, l1_goal_l2_goals
```

外键级联删除 (CASCADE / SET NULL) 由数据库自动处理，无需应用层干预。

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | 8888 | 服务端口 |
| `DB_PATH` | ./data/app.db | 数据库路径 |
| `DB_WAL` | true | 启用 WAL 模式 |
| `LOG_LEVEL` | info | 日志级别 |

## npm scripts

| 命令 | 说明 |
|------|------|
| `npm run dev` | 开发模式 (tsx watch) |
| `npm run build` | 编译 TypeScript |
| `npm start` | 生产启动 |
| `npm test` | 运行全部测试 |
| `npm run seed` | 导入种子数据 |
| `npm run backup` | 手动备份数据库 |

## Dogsquard Governance Trial

This repository is a Dogsquard governance trial copy of `dogpdteamreport`.
The original `dogpdteamreport` repository is not modified by this trial.

Dogsquard adds:

- docs governance under `docs/`
- issue and PR templates
- Node-adapted PR Quality Gate
- local validation commands through `make`
- a Control Board issue for current work and decisions

Existing project-specific docs remain in `ddd/` and `spec/`.

### Local Governance Checks

```bash
npm ci
npm test
npm run build
make help
make doc-check
make doc-guard
make test
make lint
make release-check
```

Deployment is out of scope for the first adoption PR. No production, server, reverse proxy, or public URL changes are included.
