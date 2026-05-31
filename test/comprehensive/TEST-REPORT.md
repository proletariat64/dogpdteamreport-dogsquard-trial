# API 全量 CRUD 测试报告

**测试日期**: 2026-05-21
**测试框架**: Vitest + Supertest + sql.js (in-memory)
**测试环境**: 每个测试用例独立 in-memory SQLite，通过 `createTestApp()` 创建

---

## 一、测试统计

| 指标 | 数值 |
|------|------|
| 测试文件 | 8 |
| 测试用例 | 211 |
| 通过 | 211 |
| 失败 | 0 |
| 发现缺陷 | 2 |

## 二、测试文件概览

| 文件 | 用例数 | 覆盖范围 |
|------|--------|----------|
| tags.test.ts | 19 | 创建(正常/边界/非法/安全/唯一)、列表(空/有数据/排序/API-DB比对)、删除(正常/404/重复/级联) |
| teams.test.ts | 26 | 创建(含tagIds/边界/非法/安全)、列表/详情(API-DB比对)、更新(单/多字段/清空关联/404)、删除(正常/404/级联SET NULL) |
| people.test.ts | 37 | 创建(全字段/边界/非法/managerId校验/安全)、列表(过滤name/teamId/location)、详情、更新(managerId自引用/404)、删除(级联person_tags/product_owners) |
| products.test.ts | 46 | L1: 创建(含owner/唯一code/边界/安全)、列表/详情(含l2Products)、更新(code冲突)、删除(级联L2/L1Goals)；L2: 同L1 + l1Id FK校验 |
| goals.test.ts | 54 | L0/L1/L2 各自: 创建(含关联/边界/非法/安全)、列表(过滤/API-DB比对)、详情(含子目标)、更新(含关联替换)、删除(级联关联表) |
| goal-linking.test.ts | 17 | L0-L1 和 L1-L2 的 GET/POST/DELETE (含重复关联/空数组/不存在资源) |
| dashboard.test.ts | 5 | 空DB/完整场景/teamId过滤/location过滤/coverage计算 |
| admin.test.ts | 7 | status(含recordCounts API-DB比对)/backup/backups/lock释放 + health |

## 三、API-DB 一致性验证

对每个 mutation 操作均执行了 **API 返回值 vs SQL 直接查询** 的逐字段比对：

- **Tags**: id, value, created_at, updated_at
- **Teams**: id, name, tagIds（关联表 team_tags）
- **People**: id, name, employeeId, level, teamId, location, managerId + tagIds/l1ProductIds/l2ProductIds（关联表）
- **L1 Products**: id, name, code, teamId, ownerIds（l1_product_owners）
- **L2 Products**: id, l1Id, name, code, ownerIds（l2_product_owners）
- **L0/L1/L2 Goals**: id, content, standard + 关联 goal IDs
- **Dashboard**: metrics.peopleCount, l1GoalCount, l2GoalCount
- **Admin**: recordCounts（所有 8 张主表）

所有 API-DB 比对均通过。

## 四、发现的缺陷

### BUG-001: `createTeam` 引用不存在的 tagId 返回 500

- **严重程度**: 中
- **位置**: `src/organization/team.service.ts:48` - `INSERT OR IGNORE INTO team_tags`
- **描述**: 当 `tagIds` 包含不存在的 tag ID 时，`INSERT OR IGNORE` 在 SQLite `foreign_keys=ON` 模式下无法抑制 FK 约束违反错误，导致返回 500 内部错误。
- **期望行为**: 应返回 201 静默跳过无效 tagId，或返回 400 提示 tagId 不存在。
- **复现**: `POST /api/teams` with `{ "name": "test", "tagIds": ["tag-nonexistent"] }` → 500

### BUG-002: `linkL0ToL1` 引用不存在的 L0 Goal 返回 500

- **严重程度**: 中
- **位置**: `src/goal/goal-link.service.ts:28` - linkL0ToL1 未校验 l0GoalId 存在性
- **描述**: `linkL0ToL1` 函数中的 `get("SELECT id FROM l0_goals WHERE id = ?", [l0GoalId])` 没有 throw/return 处理不存在的情况，且随后的 `INSERT OR IGNORE INTO l0_goal_l1_goals` 因 FK 约束违反抛出 500 错误。
- **期望行为**: 应返回 404 提示 L0 目标不存在。
- **复现**: `POST /api/goals/l0/g0-fake-id/l1-goals` → 500

## 五、安全测试结果

| 测试项 | 结果 | 说明 |
|--------|------|------|
| SQL 注入 (Tags) | 通过 | payload 作为字符串存储 |
| SQL 注入 (People) | 通过 | payload 作为字符串存储 |
| SQL 注入 (L1 Product) | 通过 | payload 作为字符串存储 |
| SQL 注入 (L0 Goal) | 通过 | payload 作为字符串存储 |
| XSS (Tags) | 通过 | `<script>` 作为字符串存储 |
| XSS (Teams) | 通过 | `<img onerror>` 作为字符串存储 |
| XSS (People) | 通过 | `<script>` 作为字符串存储 |

所有 SQL 注入和 XSS payload 均被正确存储为字符串，未产生安全影响。框架层（Zod schema 校验 + SQLite 参数化查询 + Helmet CSP）提供了有效防护。

## 六、总结

系统整体 CRUD 功能完善，数据一致性良好。发现 2 个中等严重度缺陷——均为 FK 约束违反时缺少优雅处理返回 500。其他方面（Zod 验证、唯一约束、级联删除、编辑锁、错误格式）均工作正常。
