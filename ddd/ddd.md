# DDD 领域建模文档

> 项目：产品管理信息录入系统  
> 版本：v1.0  
> 日期：2026-05-20  
> 状态：已定稿

---

## 一、通用语言（Ubiquitous Language）

### 1.1 组织上下文（Organization）

| 术语 | 英文 | 定义 |
|------|------|------|
| 标签 | Tag | 对团队或人员的自由分类标记，如"外汇平台"、"部门主管" |
| 团队 | Team | 人员所属的组织单元，如"马来团队"、"外汇团队" |
| 人员 | Person | 组织中的个体成员，包含姓名、工号、职级、所在地、主管关系 |
| 主管 | Manager | 人员之间的汇报关系，通过 `managerId` 建立层级 |
| 所在地 | Location | 人员办公城市，如"上海"、"杭州" |
| 职级 | Level | 内部职级标识，如"16"、"18" |

### 1.2 产品管理上下文（Product Management）

| 术语 | 英文 | 定义 |
|------|------|------|
| L1 产品 | L1 Product | 一级产品（产品大类），如"集中清算产品"，聚合根 |
| L2 产品 | L2 Product | 二级产品（产品子类/模块），严格隶属某一 L1 产品 |
| 产品编码 | Product Code | 产品的唯一业务标识，L1 全局唯一，L2 业务要求唯一 |
| 产品负责人 | Product Owner | 与 L1/L2 产品多对多关联的人员 |
| 团队归属 | Team Assignment | L1 产品可归属某一团队（弱关联，SET NULL） |

### 1.3 目标管理上下文（Goal Management）

| 术语 | 英文 | 定义 |
|------|------|------|
| L0 目标 | L0 Goal | 部门级战略目标，不直接绑定产品 |
| L1 目标 | L1 Goal | 产品级目标，严格绑定一个 L1 产品 |
| L2 目标 | L2 Goal | 模块级目标，严格绑定一个 L2 产品 |
| 目标内容 | Content | 目标的文字描述（what） |
| 衡量标准 | Standard | 目标的衡量标准（how），可选 |
| 目标分解 | Goal Decomposition | L0→L1、L1→L2 的多对多层级关联关系 |

### 1.4 透视看板上下文（Dashboard / Query Model）

| 术语 | 英文 | 定义 |
|------|------|------|
| 覆盖率 | Coverage Percent | 某 L1 产品下已分配人员的 L2 产品占比（向下取整） |
| 看板节点 | Dashboard Node | 以 L1 产品为根，聚合其下 L2、人员、目标的树形视图单元 |

---

## 二、边界上下文（Bounded Contexts）

### 2.1 组织上下文（Organization Context）

- **职责**：维护人员、团队、标签的基础数据与关联关系
- **聚合根**：`Tag`、`Team`、`Person`
- **特点**：
  - `Person` 与 `Team` 为弱关联（`SET NULL`），人员可无团队
  - `Person` 与 `Person` 通过 `managerId` 形成自引用树（主管-下属）
  - `Tag` 为独立聚合根，通过关联表与 `Team`、`Person` 多对多绑定

### 2.2 产品管理上下文（Product Management Context）

- **职责**：维护 L1/L2 产品定义、产品负责人、人员与产品的参与关系
- **聚合根**：`L1Product`（`L2Product` 为其内部实体）
- **特点**：
  - `L2Product` 在 DDD 严格意义上属于 `L1Product` 聚合内的实体，不可独立存在
  - 由于 REST 资源与 DDD 聚合存在阻抗失配，API 层面保留 `/api/products/l2` 独立端点（ADR-004），但后端通过 L1Product 聚合根事务执行写操作
  - `L1Product` 与 `Team` 为弱关联（`SET NULL`）
  - `L1Product` / `L2Product` 与 `Person` 存在两类多对多关系：Owner（负责人）与 Participant（参与者，通过 `person_lX_products`）

### 2.3 目标管理上下文（Goal Management Context）

- **职责**：维护 L0/L1/L2 三级目标及层级分解关系
- **聚合根**：`L0Goal`、`L1Goal`、`L2Goal`
- **特点**：
  - `L1Goal` 严格隶属于一个 `L1Product`（1:N），产品删除时级联删除其目标
  - `L2Goal` 严格隶属于一个 `L2Product`（1:N）
  - `L0Goal` 为独立聚合根，不直接绑定产品
  - `L0Goal` 与 `L1Goal`、`L1Goal` 与 `L2Goal` 之间为多对多分解关系

### 2.4 透视看板上下文（Dashboard Context）

- **职责**：跨上下文聚合查询，生成只读树形视图
- **性质**：非核心域，属于查询模型（CQRS 读模型），直接通过 SQL JOIN 实现，不维护独立的聚合状态

---

## 三、聚合根、实体与值对象

### 3.1 聚合根（Aggregate Roots）

| 上下文 | 聚合根 | 标识 | 关键属性 |
|--------|--------|------|----------|
| 组织 | `Tag` | `id` (TEXT) | `value` (唯一) |
| 组织 | `Team` | `id` (TEXT) | `name` |
| 组织 | `Person` | `id` (TEXT) | `name`, `employeeId`, `level`, `location`, `teamId`, `managerId` |
| 产品 | `L1Product` | `id` (TEXT) | `name`, `code` (全局唯一), `teamId` |
| 目标 | `L0Goal` | `id` (TEXT) | `content`, `standard` |
| 目标 | `L1Goal` | `id` (TEXT) | `l1ProductId`, `content`, `standard` |
| 目标 | `L2Goal` | `id` (TEXT) | `l2ProductId`, `content`, `standard` |

### 3.2 内部实体（Internal Entities）

| 所属聚合 | 实体 | 标识 | 说明 |
|----------|------|------|------|
| `L1Product` | `L2Product` | `id` (TEXT) | 必须隶属且仅隶属一个 L1Product；`l1Id` 不可为空 |

### 3.3 值对象（Value Objects）

| 值对象 | 定义 | 约束 | 使用位置 |
|--------|------|------|----------|
| `ProductCode` | 产品业务编码 | 非空，长度 ≤20，L1 全局唯一 | `L1Product.code`, `L2Product.code` |
| `EmployeeId` | 员工编号 | 长度 ≤20，可空 | `Person.employeeId` |
| `Level` | 职级 | 长度 ≤10，可空 | `Person.level` |
| `Location` | 所在地 | 长度 ≤50，可空 | `Person.location` |
| `GoalStandard` | 目标衡量标准 | 长度 ≤2000，可空 | `L0Goal.standard`, `L1Goal.standard`, `L2Goal.standard` |
| `TagValue` | 标签文本 | 非空，长度 ≤50，全局唯一 | `Tag.value` |

### 3.4 关联对象（Association Objects）

以下对象在物理层表现为关联表，在领域层表示两个聚合根之间的多对多关系：

- `TeamTag` — Team ↔ Tag
- `PersonTag` — Person ↔ Tag
- `L1ProductOwner` — L1Product ↔ Person
- `L2ProductOwner` — L2Product ↔ Person
- `PersonL1Product` — Person ↔ L1Product（参与关系）
- `PersonL2Product` — Person ↔ L2Product（参与关系）
- `L0GoalL1Goal` — L0Goal ↔ L1Goal（目标分解）
- `L1GoalL2Goal` — L1Goal ↔ L2Goal（目标分解）

---

## 四、领域事件（Domain Events）

本系统当前为**简单 CRUD + 查询**场景，不引入事件总线或消息队列。以下事件在**应用层/服务层**通过事务内的级联操作逻辑等价实现。

| 事件 | 发布者 | 订阅处理 |
|------|--------|----------|
| `TeamDeleted` | Team 聚合 | Person.teamId → NULL；L1Product.teamId → NULL |
| `PersonDeleted` | Person 聚合 | 清理 l1_product_owners / l2_product_owners；下属 managerId → NULL；清理 person_l1_products / person_l2_products / person_tags |
| `TagDeleted` | Tag 聚合 | 清理 team_tags / person_tags |
| `L1ProductDeleted` | L1Product 聚合 | 级联删除所有 L2Product；清理 l1_product_owners / person_l1_products / l1_goals |
| `L2ProductDeleted` | L2Product（内部实体） | 清理 l2_product_owners / person_l2_products / l2_goals |
| `L0GoalDeleted` | L0Goal 聚合 | 清理 l0_goal_l1_goals |
| `L1GoalDeleted` | L1Goal 聚合 | 清理 l0_goal_l1_goals / l1_goal_l2_goals |
| `L2GoalDeleted` | L2Goal 聚合 | 清理 l1_goal_l2_goals |

> **决策说明**：本场景数据量级极小（数百条）、并发极低，通过数据库外键级联 + 应用层显式清理即可满足一致性要求，引入事件总线会增加不必要的复杂度。

---

## 五、不变量（Invariants / 业务规则）

### 5.1 全局不变量

| 编号 | 规则 | 校验层级 |
|------|------|----------|
| INV-001 | `Tag.value` 全局唯一 | 数据库 UNIQUE + 应用层校验 |
| INV-002 | `L1Product.code` 全局唯一 | 数据库 UNIQUE + 应用层校验 |
| INV-003 | `Person.managerId` 不能等于自身 `id`（禁止自引用） | 应用层（Zod refine） |
| INV-004 | `Person.managerId` 如非空，则对应 Person 必须存在 | 数据库外键 + 应用层校验 |

### 5.2 组织上下文不变量

| 编号 | 规则 |
|------|------|
| INV-ORG-001 | 删除 Team 时，关联 Person 的 `teamId` 置空（不删除人员） |
| INV-ORG-002 | 删除 Team 时，关联 L1Product 的 `teamId` 置空（不删除产品） |
| INV-ORG-003 | 删除 Person 时，其下属的 `managerId` 置空（主管链断裂，不级联删除下属） |

### 5.3 产品管理上下文不变量

| 编号 | 规则 |
|------|------|
| INV-PROD-001 | `L2Product.l1Id` 不可为空，且必须指向存在的 L1Product |
| INV-PROD-002 | 删除 L1Product 时，其下所有 L2Product 必须级联删除（聚合一致性） |
| INV-PROD-003 | L2Product 的 `code` 在业务上要求唯一（当前数据库层未设 UNIQUE，由应用层保证） |

### 5.4 目标管理上下文不变量

| 编号 | 规则 |
|------|------|
| INV-GOAL-001 | `L1Goal.l1ProductId` 不可为空，且必须指向存在的 L1Product |
| INV-GOAL-002 | `L2Goal.l2ProductId` 不可为空，且必须指向存在的 L2Product |
| INV-GOAL-003 | 删除 L1Product 时，其下所有 L1Goal 级联删除 |
| INV-GOAL-004 | 删除 L2Product 时，其下所有 L2Goal 级联删除 |

---

## 六、级联删除策略汇总

| 触发操作 | 关联对象 | 数据库策略 | 补充说明 |
|----------|----------|------------|----------|
| 删除 `Tag` | `team_tags` | CASCADE | 关联表自动清理 |
| 删除 `Tag` | `person_tags` | CASCADE | 关联表自动清理 |
| 删除 `Team` | `Person.teamId` | SET NULL | 人员保留，团队归属清空 |
| 删除 `Team` | `L1Product.teamId` | SET NULL | 产品保留，团队归属清空 |
| 删除 `Person` | `l1_product_owners` | CASCADE | Owner 关联清理 |
| 删除 `Person` | `l2_product_owners` | CASCADE | Owner 关联清理 |
| 删除 `Person` | `person_l1_products` | CASCADE | 参与关联清理 |
| 删除 `Person` | `person_l2_products` | CASCADE | 参与关联清理 |
| 删除 `Person` | `person_tags` | CASCADE | 标签关联清理 |
| 删除 `Person` | `people.manager_id`（下属） | SET NULL | 主管链断裂 |
| 删除 `L1Product` | `l2_products` | CASCADE | **聚合一致性** |
| 删除 `L1Product` | `l1_product_owners` | CASCADE | Owner 关联清理 |
| 删除 `L1Product` | `person_l1_products` | CASCADE | 参与关联清理 |
| 删除 `L1Product` | `l1_goals` | CASCADE | 目标级联删除 |
| 删除 `L2Product` | `l2_product_owners` | CASCADE | Owner 关联清理 |
| 删除 `L2Product` | `person_l2_products` | CASCADE | 参与关联清理 |
| 删除 `L2Product` | `l2_goals` | CASCADE | 目标级联删除 |
| 删除 `L0Goal` | `l0_goal_l1_goals` | CASCADE | 分解关系清理 |
| 删除 `L1Goal` | `l0_goal_l1_goals` | CASCADE | 分解关系清理 |
| 删除 `L1Goal` | `l1_goal_l2_goals` | CASCADE | 分解关系清理 |
| 删除 `L2Goal` | `l1_goal_l2_goals` | CASCADE | 分解关系清理 |

---

## 七、数据迁移映射（原原型 → 新领域模型）

### 7.1 来源格式
原纯静态原型使用单一 `data.json`，结构如下：

```json
{
  "tags": ["外汇平台", "部门主管"],
  "teams": [{ "id": "team-1", "name": "马来团队", "tags": ["外汇平台"] }],
  "people": [{ "id": "p-1", "name": "张三", "tags": ["部门主管"], "l1Products": [...], "l2Products": [...] }],
  "l1Products": [{ "id": "l1-1", "name": "集中清算", "code": "FF4010000", "teamId": "team-1", "owners": ["p-1"] }],
  "l2Products": [{ "id": "l2-1", "l1Id": "l1-1", "name": "跨境清算", "code": "FF4010100" }],
  "goals": { "l0": [...], "l1": [...], "l2": [...] }
}
```

### 7.2 映射规则

| 原字段 | 新模型 | 映射说明 |
|--------|--------|----------|
| `tags[]` (字符串数组) | `Tag` 实体 + `team_tags` / `person_tags` | 去重后写入 `tags` 表，再按原关联建立多对多关系 |
| `teams[].tags[]` | `Team` + `TeamTag` | 同上 |
| `people[].tags[]` | `Person` + `PersonTag` | 同上 |
| `people[].l1Products[]` | `PersonL1Product` | 原字符串数组 → 关联表 |
| `people[].l2Products[]` | `PersonL2Product` | 原字符串数组 → 关联表 |
| `l1Products[].owners[]` | `L1ProductOwner` | 原字符串数组 → 关联表 |
| `l2Products[].owners[]` | `L2ProductOwner` | 原字符串数组 → 关联表 |
| `goals.l1[].productId` | `L1Goal.l1ProductId` | 原 Goal 多选产品取**第一个**作为外键 |
| `goals.l2[].productId` | `L2Goal.l2ProductId` | 同上 |
| `goals.l0[].l1GoalIds[]` | `L0GoalL1Goal` | 直接映射为多对多关联 |
| `goals.l1[].l2GoalIds[]` | `L1GoalL2Goal` | 直接映射为多对多关联 |

> **注意**：导入接口 `/api/import` 设计为**全量覆盖**（先清空现有数据，再写入新数据），生产环境执行前必须先备份。

---

## 八、关键设计决策（DDD 视角）

### DDD-01：Tag 提取为独立聚合根

**背景**：原型中 `tags` 是 `teams` / `people` 内的字符串数组。  
**决策**：将 Tag 提升为独立聚合根，通过关联表建立多对多关系。  
**理由**：
1. 标签可被多个团队/人员复用，具备独立生命周期
2. 便于后续扩展标签属性（如颜色、分类）
3. 删除标签时不影响团队/人员主体

### DDD-02：物理删除，不支持软删除

**背景**：部分系统采用 `deleted_at` 实现软删除以保留审计痕迹。  
**决策**：全局采用物理删除（`DELETE CASCADE`）。  
**理由**：
1. 本场景数据量级极小（数百条），误操作概率低
2. 已有完善的备份机制（`scripts/backup.ts` + crontab）
3. 软删除会污染所有查询条件，增加复杂度
4. 数据量小，恢复备份即可回滚

### DDD-03：L1Product 作为聚合根，L2Product 作为内部实体

**背景**：L2 产品严格依附于 L1 产品存在，无独立业务含义。  
**决策**：DDD 建模上将 L2Product 归入 L1Product 聚合；但 REST API 保留独立端点（ADR-004）。  
**理由**：
1. 领域上 L2 无法脱离 L1 存在，符合聚合定义
2. 前端现有界面直接操作 L2（独立表格、弹窗），独立端点可减少前端改动
3. 后端 Service 层通过事务包装写操作，保证聚合一致性

### DDD-04：Person 与 Product 的两种关联语义

**背景**：原型中人员与产品只有一种关联。  
**决策**：区分为 Owner（负责人）和 Participant（参与者，通过 `person_lX_products`）。  
**理由**：
1. Owner 是管理职责，用于看板统计和问责
2. Participant 是实际投入人员，用于覆盖率计算
3. 两者在 Dashboard 中展示维度不同

---

## 九、与架构文档的关联

| 本文档章节 | 关联文档 | 关联内容 |
|------------|----------|----------|
| 边界上下文 | `spec/v1.0/architecture.md` | 4 层分层架构、目录结构规划 |
| 级联策略 | `spec/v1.0/api-spec.md` | 各端点的级联行为说明 |
| 数据迁移 | `spec/v1.0/deployment.md` | 首次部署时的数据导入流程 |
| 不变量 | `test/test-cases.md` | TC-CASCADE-001/002、TC-PERSON-002 等用例 |
