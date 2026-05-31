# API 全量 CRUD 测试方案

## 1. 系统概况

- **框架**: Express + sql.js (SQLite WASM in-memory)
- **校验**: Zod schemas
- **测试工具**: Vitest + Supertest
- **测试数据库**: 每个测试用例独立 in-memory SQLite（`createTestApp()`）

## 2. 实体与字段约束

### 2.1 Tag
| 字段 | 类型 | 约束 |
|------|------|------|
| id | TEXT | PK, 自动生成 (tag-xxx) |
| value | TEXT | NOT NULL, UNIQUE, min 1, max 50 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

### 2.2 Team
| 字段 | 类型 | 约束 |
|------|------|------|
| id | TEXT | PK, 自动生成 (team-xxx) |
| name | TEXT | NOT NULL, min 1, max 100 |
| tagIds | array | M2M via team_tags |
| created_at / updated_at | DATETIME | auto |

### 2.3 Person
| 字段 | 类型 | 约束 |
|------|------|------|
| id | TEXT | PK, 自动生成 (p-xxx) |
| name | TEXT | NOT NULL, min 1, max 100 |
| employeeId | TEXT | nullable, max 20 |
| level | TEXT | nullable, max 10 |
| tagIds | array | M2M via person_tags |
| teamId | TEXT | nullable, FK → teams(id) SET NULL |
| location | TEXT | nullable, max 50 |
| managerId | TEXT | nullable, FK → people(id) SET NULL, 不能=自身 |
| l1ProductIds / l2ProductIds | array | M2M |
| created_at / updated_at | DATETIME | auto |

### 2.4 L1Product
| 字段 | 类型 | 约束 |
|------|------|------|
| id | TEXT | PK, 自动生成 (l1-xxx) |
| name | TEXT | NOT NULL, min 1, max 100 |
| code | TEXT | NOT NULL, UNIQUE, min 1, max 20 |
| teamId | TEXT | nullable, FK → teams(id) SET NULL |
| ownerIds | array | M2M via l1_product_owners |
| created_at / updated_at | DATETIME | auto |

### 2.5 L2Product
| 字段 | 类型 | 约束 |
|------|------|------|
| id | TEXT | PK, 自动生成 (l2-xxx) |
| l1Id | TEXT | NOT NULL, FK → l1_products(id) CASCADE |
| name | TEXT | NOT NULL, min 1, max 100 |
| code | TEXT | NOT NULL, min 1, max 20 |
| ownerIds | array | M2M via l2_product_owners |
| created_at / updated_at | DATETIME | auto |

### 2.6 L0Goal
| 字段 | 类型 | 约束 |
|------|------|------|
| id | TEXT | PK, 自动生成 (g0-xxx) |
| content | TEXT | NOT NULL, min 1, max 2000 |
| standard | TEXT | nullable, max 2000 |
| l1GoalIds | array | M2M via l0_goal_l1_goals |
| created_at / updated_at | DATETIME | auto |

### 2.7 L1Goal
| 字段 | 类型 | 约束 |
|------|------|------|
| id | TEXT | PK, 自动生成 (g1-xxx) |
| l1ProductId | TEXT | NOT NULL, FK → l1_products(id) CASCADE |
| content | TEXT | NOT NULL, min 1, max 2000 |
| standard | TEXT | nullable, max 2000 |
| l0GoalIds / l2GoalIds | array | M2M |
| created_at / updated_at | DATETIME | auto |

### 2.8 L2Goal
| 字段 | 类型 | 约束 |
|------|------|------|
| id | TEXT | PK, 自动生成 (g2-xxx) |
| l2ProductId | TEXT | NOT NULL, FK → l2_products(id) CASCADE |
| content | TEXT | NOT NULL, min 1, max 2000 |
| standard | TEXT | nullable, max 2000 |
| l1GoalIds | array | M2M via l1_goal_l2_goals |
| created_at / updated_at | DATETIME | auto |

## 3. API 端点清单 (45个)

### Tags (3)
- `GET /api/tags` - 列表
- `POST /api/tags` - 创建
- `DELETE /api/tags/:id` - 删除

### Teams (5)
- `GET /api/teams` - 列表
- `GET /api/teams/:id` - 详情
- `POST /api/teams` - 创建
- `PUT /api/teams/:id` - 更新
- `DELETE /api/teams/:id` - 删除

### People (5)
- `GET /api/people` - 列表 (支持 name/teamId/location 过滤)
- `GET /api/people/:id` - 详情
- `POST /api/people` - 创建
- `PUT /api/people/:id` - 更新
- `DELETE /api/people/:id` - 删除

### L1 Products (5)
- `GET /api/products/l1` - 列表
- `GET /api/products/l1/:id` - 详情 (含 l2Products)
- `POST /api/products/l1` - 创建
- `PUT /api/products/l1/:id` - 更新
- `DELETE /api/products/l1/:id` - 删除 (级联删除 L2)

### L2 Products (5)
- `GET /api/products/l2` - 列表 (支持 l1Id 过滤)
- `GET /api/products/l2/:id` - 详情
- `POST /api/products/l2` - 创建
- `PUT /api/products/l2/:id` - 更新
- `DELETE /api/products/l2/:id` - 删除

### L0 Goals (5)
- `GET /api/goals/l0` - 列表
- `GET /api/goals/l0/:id` - 详情 (含 l1Goals)
- `POST /api/goals/l0` - 创建
- `PUT /api/goals/l0/:id` - 更新
- `DELETE /api/goals/l0/:id` - 删除

### L1 Goals (5)
- `GET /api/goals/l1` - 列表 (支持 l1ProductId 过滤)
- `GET /api/goals/l1/:id` - 详情 (含 l2Goals)
- `POST /api/goals/l1` - 创建
- `PUT /api/goals/l1/:id` - 更新
- `DELETE /api/goals/l1/:id` - 删除

### L2 Goals (5)
- `GET /api/goals/l2` - 列表 (支持 l2ProductId 过滤)
- `GET /api/goals/l2/:id` - 详情
- `POST /api/goals/l2` - 创建
- `PUT /api/goals/l2/:id` - 更新
- `DELETE /api/goals/l2/:id` - 删除

### Goal Linking (6)
- `GET /api/goals/l0/:id/l1-goals` - 查看 L0 关联的 L1
- `POST /api/goals/l0/:id/l1-goals` - 关联 L0→L1
- `DELETE /api/goals/l0/:id/l1-goals/:l1GoalId` - 解除 L0-L1
- `GET /api/goals/l1/:id/l2-goals` - 查看 L1 关联的 L2
- `POST /api/goals/l1/:id/l2-goals` - 关联 L1→L2
- `DELETE /api/goals/l1/:id/l2-goals/:l2GoalId` - 解除 L1-L2

### Dashboard (1)
- `GET /api/dashboard` - 看板 (支持 teamId/location 过滤)

### Admin (4)
- `GET /api/admin/status` - 系统状态
- `POST /api/admin/backup` - 创建备份
- `GET /api/admin/backups` - 备份列表
- `GET /api/admin/backup/:filename` - 下载备份
- `DELETE /api/admin/lock` - 强制释放编辑锁

### Health (1)
- `GET /api/health` - 健康检查

## 4. 测试策略

### 4.1 每个实体的测试维度

#### CREATE
- [ ] 正常创建（必填字段）
- [ ] 正常创建（全部字段含可选）
- [ ] 正常创建（含关联数据）
- [ ] 边界值：name/content 最小长度 (1)
- [ ] 边界值：name/content 最大长度 (100/2000)
- [ ] 边界值：code 最大长度 (20)
- [ ] 非法：必填字段缺失
- [ ] 非法：字段类型错误（数字传字符串等——Zod 可能 coerce）
- [ ] 非法：超长字段
- [ ] 非法：空字符串
- [ ] 安全：SQL 注入尝试
- [ ] 安全：XSS 尝试
- [ ] 关联：引用不存在的 FK
- [ ] 唯一约束：重复 code/value
- [ ] API-DB 一致性：逐字段比对

#### READ
- [ ] 列表：空数据库
- [ ] 列表：有数据
- [ ] 列表：过滤条件
- [ ] 详情：正常获取
- [ ] 详情：不存在的 ID → 404
- [ ] 详情：含关联数据检查
- [ ] API-DB 一致性：列表数量、详情字段比对

#### UPDATE
- [ ] 正常更新（单个字段）
- [ ] 正常更新（多个字段含关联）
- [ ] 更新不存在的 ID → 404
- [ ] 边界值测试
- [ ] 非法输入
- [ ] FK 引用不存在的资源
- [ ] 唯一约束冲突
- [ ] API-DB 一致性：更新后逐字段比对

#### DELETE
- [ ] 正常删除
- [ ] 删除不存在的 ID → 404
- [ ] 重复删除 → 404
- [ ] 级联删除验证（关联表清理）
- [ ] API-DB 一致性：删除后 DB 确认不存在

### 4.2 数据校验方式

对每个 mutation 操作：
1. 调用 API 获取响应 body
2. 直接使用 `all()` / `get()` 查询 SQLite
3. 逐字段比对 API 返回值与 DB 实际数据
4. 对于关联表（tagIds, ownerIds 等），分别查询关联表验证

### 4.3 错误响应格式验证
- 400: `{ success: false, error: { code: "VALIDATION_ERROR", message, details } }`
- 404: `{ success: false, error: { code: "RESOURCE_NOT_FOUND", message } }`
- 409: `{ success: false, error: { code: "UNIQUE_VIOLATION", message } }`
- 423: `{ success: false, error: { code: "RESOURCE_LOCKED", message, details } }`
- 成功: `{ success: true, data }`

## 5. 测试文件结构

```
test/
├── api-test-plan.md          # 本文件
├── setup.ts                  # 已有：createTestApp()
├── helpers.ts                # 已有：createTestTag/Team/Person
└── comprehensive/
    ├── tags.test.ts
    ├── teams.test.ts
    ├── people.test.ts
    ├── products.test.ts      # L1 + L2 products
    ├── goals.test.ts         # L0 + L1 + L2 goals
    ├── goal-linking.test.ts
    ├── dashboard.test.ts
    ├── admin.test.ts
    └── health.test.ts
```

## 6. 运行方式

```bash
npx vitest run test/comprehensive/
```
