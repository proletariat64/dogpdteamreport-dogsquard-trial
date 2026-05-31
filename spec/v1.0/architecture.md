# 技术架构总览

> 项目：产品管理信息录入系统
> 版本：v1.0
> 日期：2026-05-20
> 状态：已定稿

---

## 一、技术栈选型

### 1.1 核心依赖

| 层级 | 技术 | 版本 | 选型理由 |
|---|---|---|---|
| 运行时 | Node.js | >= 20.0.0 | LTS 版本，内置 fetch、Test Runner，性能与稳定性兼顾 |
| 语言 | TypeScript | >= 5.4.0 | 静态类型检查，IDE 智能提示，降低重构成本 |
| 数据库 | SQLite | 3.x | 嵌入式、零配置、单文件，与本场景低负载特征完美匹配 |
| 数据库驱动 | better-sqlite3 | ^11.0.0 | 同步 API（性能数倍于 sqlite3），支持预编译语句和 WAL 模式 |
| Web 框架 | Express | ^4.19.0 | 团队熟悉度高，中间件生态成熟，本场景无需 Fastify 的极致性能 |
| 校验库 | Zod | ^3.23.0 | TS 原生集成，前后端可共享 Schema，错误信息友好 |
| 安全 | helmet | ^7.1.0 | 自动设置安全 HTTP 头 |
| 压缩 | compression | ^1.7.0 | Gzip 响应压缩 |
| 环境变量 | dotenv | ^16.4.0 | 开发环境配置管理 |

### 1.2 开发工具

| 工具 | 版本 | 用途 |
|---|---|---|
| tsx | ^4.11.0 | 开发阶段零配置运行 TS，替代 ts-node（更快） |
| vitest | ^1.6.0 | 单元测试与集成测试框架，原生 ESM/TS 支持 |
| supertest | ^7.0.0 | HTTP 集成测试 |

### 1.3 明确不使用的技术

| 技术 | 不使用的理由 |
|---|---|
| ORM (Prisma/TypeORM/Sequelize) | 本场景表结构简单且关系清晰，手写 SQL 可避免 ORM 抽象泄漏，迁移更灵活 |
| 前端框架 (Vue/React) | 用户要求"前端 UI 布局与交互逻辑严格参照原型"，保留纯 HTML/JS 零构建成本最低 |
| Docker | 单服务器内网场景，直接 `npm start` 即可，Docker 增加不必要的复杂度 |
| Redis | 数据量级数百条，SQLite 自身缓存已足够，无需额外缓存层 |
| JWT/Session 认证 | 5-10 人内网办公，无强安全诉求，如需基础认证由 Nginx 反向代理处理 |

---

## 二、架构风格

### 2.1 分层架构

采用**整洁架构 / 领域驱动设计分层**：

```
┌─────────────────────────────────────────┐
│  Interface 层（接口适配层）              │
│  HTTP Controllers + Routes              │
│  职责：接收请求、解析参数、组装响应       │
├─────────────────────────────────────────┤
│  Application 层（应用层）                │
│  Services + DTOs + Mappers              │
│  职责：编排领域对象、事务控制、权限校验     │
├─────────────────────────────────────────┤
│  Domain 层（领域层）                     │
│  Entities + Value Objects + Repositories │
│  职责：核心业务逻辑、领域规则、不变量      │
├─────────────────────────────────────────┤
│  Infrastructure 层（基础设施层）         │
│  SQLite Repositories + Express + Config  │
│  职责：数据库访问、HTTP 服务、配置读取      │
└─────────────────────────────────────────┘
```

### 2.2 依赖规则

- 上层依赖下层，下层不依赖上层
- 领域层不依赖任何框架或数据库
- 跨层通信通过接口（Repository Interface）解耦

---

## 三、项目目录结构

```
dogpdteamreport/
├── package.json
├── package-lock.json
├── tsconfig.json
├── .env                          # 环境变量（数据库路径、端口）
├── .env.example                  # 环境变量模板
├── .gitignore
│
├── src/
│   ├── main.ts                   # 应用入口：初始化数据库、启动服务器
│   ├── app.module.ts             # 根模块：依赖注入容器、路由注册
│   │
│   ├── config/
│   │   └── database.config.ts    # SQLite 连接配置（路径、WAL 模式）
│   │
│   ├── domain/                   # ========== 领域层 ==========
│   │   ├── product/
│   │   │   ├── entities/
│   │   │   │   ├── l1-product.entity.ts
│   │   │   │   └── l2-product.entity.ts
│   │   │   ├── value-objects/
│   │   │   │   └── product-code.vo.ts
│   │   │   └── repositories/
│   │   │       └── l1-product.repository.interface.ts
│   │   │
│   │   ├── organization/
│   │   │   ├── entities/
│   │   │   │   ├── team.entity.ts
│   │   │   │   ├── person.entity.ts
│   │   │   │   └── tag.entity.ts
│   │   │   └── repositories/
│   │   │       ├── team.repository.interface.ts
│   │   │       ├── person.repository.interface.ts
│   │   │       └── tag.repository.interface.ts
│   │   │
│   │   └── goal/
│   │       ├── entities/
│   │       │   ├── l0-goal.entity.ts
│   │       │   ├── l1-goal.entity.ts
│   │       │   └── l2-goal.entity.ts
│   │       └── repositories/
│   │           ├── l0-goal.repository.interface.ts
│   │           ├── l1-goal.repository.interface.ts
│   │           └── l2-goal.repository.interface.ts
│   │
│   ├── application/              # ========== 应用层 ==========
│   │   ├── product/
│   │   │   ├── dto/
│   │   │   │   ├── create-l1-product.dto.ts
│   │   │   │   ├── update-l1-product.dto.ts
│   │   │   │   └── create-l2-product.dto.ts
│   │   │   ├── services/
│   │   │   │   ├── product.service.ts
│   │   │   │   └── product-cascade.service.ts
│   │   │   └── mappers/
│   │   │       └── product.mapper.ts
│   │   │
│   │   ├── organization/
│   │   │   ├── dto/
│   │   │   │   ├── create-person.dto.ts
│   │   │   │   └── create-team.dto.ts
│   │   │   └── services/
│   │   │       ├── person.service.ts
│   │   │       ├── team.service.ts
│   │   │       └── cascade-delete.service.ts
│   │   │
│   │   ├── goal/
│   │   │   ├── dto/
│   │   │   │   ├── create-l0-goal.dto.ts
│   │   │   │   ├── create-l1-goal.dto.ts
│   │   │   │   └── create-l2-goal.dto.ts
│   │   │   ├── services/
│   │   │   │   ├── l0-goal.service.ts
│   │   │   │   ├── l1-goal.service.ts
│   │   │   │   ├── l2-goal.service.ts
│   │   │   │   └── goal-link.service.ts       # 处理 L0↔L1、L1↔L2 关联
│   │   │   └── mappers/
│   │   │       └── goal.mapper.ts
│   │   │
│   │   └── dashboard/
│   │       ├── dto/
│   │       │   └── dashboard-query.dto.ts
│   │       └── services/
│   │           └── dashboard.service.ts        # 专用读取服务，直接 JOIN 查询
│   │
│   ├── infrastructure/           # ========== 基础设施层 ==========
│   │   ├── database/
│   │   │   ├── connection.ts             # SQLite 连接管理（better-sqlite3）
│   │   │   ├── schema.sql                # 完整 DDL（版本化）
│   │   │   └── migrations/               # 迁移脚本
│   │   │       └── 001_init.sql
│   │   │
│   │   ├── repositories/
│   │   │   ├── sqlite-product.repository.ts    # L1 聚合根仓储，内含 L2 操作
│   │   │   ├── sqlite-team.repository.ts
│   │   │   ├── sqlite-person.repository.ts
│   │   │   ├── sqlite-tag.repository.ts
│   │   │   ├── sqlite-l0-goal.repository.ts
│   │   │   ├── sqlite-l1-goal.repository.ts
│   │   │   └── sqlite-l2-goal.repository.ts
│   │   │
│   │   ├── seed/
│   │   │   └── seed-data.ts              # 种子数据导入逻辑
│   │   │
│   │   └── web/
│   │       ├── server.ts                 # Express 服务器配置
│   │       ├── middleware/
│   │       │   ├── error-handler.ts
│   │       │   ├── request-logger.ts
│   │       │   └── cors.ts
│   │       └── routes/
│   │           ├── index.ts
│   │           ├── product.routes.ts
│   │           ├── team.routes.ts
│   │           ├── person.routes.ts
│   │           ├── tag.routes.ts
│   │           ├── goal.routes.ts
│   │           ├── goal-link.routes.ts
│   │           └── dashboard.routes.ts
│   │
│   └── interface/                # ========== 接口适配层 ==========
│       └── http/
│           └── controllers/
│               ├── product.controller.ts
│               ├── team.controller.ts
│               ├── person.controller.ts
│               ├── tag.controller.ts
│               ├── goal.controller.ts
│               └── dashboard.controller.ts
│
├── www-root/                     # 项目根目录（前端 + 数据）
│   ├── index.html                # 主页面（由原原型迁移）
│   ├── css/
│   ├── js/
│   └── data/                     # 运行时数据（SQLite + JSON）
│
├── data/                         # 运行时数据目录
│   ├── app.db                    # SQLite 主数据库（gitignored）
│   ├── app.db-shm                # WAL shared-memory（gitignored）
│   ├── app.db-wal                # WAL 文件（gitignored）
│   └── backups/                  # 自动备份目录（gitignored）
│
├── scripts/
│   ├── migrate.ts                # 数据库迁移脚本
│   ├── backup.ts                 # 手动备份脚本
│   └── import-json.ts            # 从原型 data.json 迁移导入
│
└── test/
    ├── setup.ts                  # 测试前置脚本
    ├── fixtures/
    │   └── test-data.ts          # 测试数据工厂
    ├── unit/                     # 领域逻辑单元测试
    ├── integration/              # API 集成测试（supertest）
    ├── test-plan.md              # 测试总计划
    ├── test-cases.md             # 测试用例
    └── test-spec.md              # 测试规范
```

---

## 四、关键架构决策 (ADR)

### ADR-001：使用 better-sqlite3 而非 sqlite3

**背景**：Node.js 有两个主流 SQLite 驱动：`sqlite3`（异步回调）和 `better-sqlite3`（同步 API）。

**决策**：选用 `better-sqlite3`。

**理由**：
1. 同步 API 在事务处理时代码更直观，无需 async/await 嵌套
2. 官方基准测试显示性能数倍于 `sqlite3`
3. 本场景并发极低，同步阻塞不会造成实际问题
4. 原生支持预编译语句（Prepared Statement），防止 SQL 注入

### ADR-002：不使用 ORM

**背景**：Prisma、TypeORM 等 ORM 可加速开发，但增加了抽象层。

**决策**：手写 SQL，Repository 模式直接操作 `better-sqlite3`。

**理由**：
1. 本场景仅 10 张表，关系清晰，ORM 的收益有限
2. 多对多关联表、层级聚合查询等场景手写 SQL 更直观
3. 避免 ORM 的 "N+1 查询" 和抽象泄漏问题
4. 便于后续从 SQLite 迁移到 PostgreSQL（只需换驱动，SQL 方言变化小）

### ADR-003：保留纯 HTML/JS 前端

**背景**：用户要求"前端 UI 布局与交互逻辑严格参照原型"。

**决策**：保留纯 HTML + 原生 JS，不引入 Vue/React/Vite 构建工具。

**理由**：
1. 零构建步骤，部署只需复制静态文件
2. 原型已具备完整的组件逻辑（TableBuilder、MultiSelect、Modal 等），迁移成本低
3. 5-10 人内网使用，无需 SSR 或复杂状态管理
4. 未来如需现代化，可渐进式引入 Vue3（通过 CDN 方式）

### ADR-004：L2 产品保留独立 REST 端点

**背景**：DDD 严格模式下，L2Product 是 L1Product 聚合内的实体，不应有独立 API。

**决策**：保留 `/api/products/l2` 端点，但后端通过 L1Product 聚合根事务执行。

**理由**：
1. 前端现有界面直接操作 L2（独立表格、独立弹窗），独立端点可减少前端改动
2. 后端在 Service 层通过事务包装，保证聚合一致性
3. 这是 DDD 在 RESTful 系统中的常见折中（REST 资源 vs DDD 聚合的阻抗失配）

---

## 五、环境变量配置

`.env`：

```bash
# 服务配置
PORT=8888
NODE_ENV=development

# 数据库配置
DB_PATH=./data/app.db
DB_WAL=true                    # 启用 WAL 模式
DB_BACKUP_DIR=./data/backups

# 日志配置
LOG_LEVEL=info                 # debug | info | warn | error

# 安全（可选）
# BASIC_AUTH_USER=admin
# BASIC_AUTH_PASS=changeme
```

---

## 六、启动流程

```
main.ts
  ├── 加载 .env
  ├── 初始化数据库连接（better-sqlite3）
  │   ├── 检查数据库文件是否存在
  │   ├── 执行迁移脚本（migrations/*.sql）
  │   └── 启用 WAL 模式（如配置开启）
  ├── 注册 Express 中间件（helmet、compression、cors、json、logger）
  ├── 注册 API 路由（/api/*）
  ├── 注册静态文件服务（www-root/）
  ├── 注册错误处理中间件（全局兜底）
  └── 监听端口
```

---

## 七、数据库迁移策略

| 场景 | 处理方式 |
|---|---|
| 首次部署 | 执行 `scripts/migrate.ts`，按版本号顺序执行 `migrations/*.sql` |
| 版本升级 | 新增 `migrations/002_xxx.sql`，脚本自动检测已执行版本并应用增量 |
| Schema 版本记录 | `migrations` 表中记录已执行的版本号 |
| 回滚 | 本场景数据量极小，回滚策略为：备份恢复 + 重新迁移 |

---

## 八、测试策略

| 类型 | 范围 | 工具 | 目标 |
|---|---|---|---|
| 单元测试 | 领域层 Entity / VO 的业务逻辑 | Vitest | 覆盖领域规则与不变量 |
| 集成测试 | Application Service + Repository | Vitest + supertest | 覆盖 CRUD 与级联操作 |
| API 测试 | HTTP 端点 | supertest | 覆盖请求校验、错误响应、状态码 |
| 数据迁移测试 | import-json.ts | 手动 + 脚本断言 | 验证原型数据完整导入 |

---

> **关联文档**：> - [API 接口规范](api-spec.md)
> - [部署方案](deployment.md)
