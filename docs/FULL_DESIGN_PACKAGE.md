# 前端重构与界面设计方案包

> 项目：部门目标管理录入系统  
> 日期：2026-05-28  
> 版本：v1.0 — 设计阶段交付物  

---

## 第1部分：实施计划与规范

### 1.1 项目概述与重构范围

本项目是一个轻量级全栈 CRUD 应用，后端采用 Express + sql.js (SQLite WASM)，前端当前为纯 HTML/CSS/JS（零构建步骤、零框架）。

**本次重构范围：**
- 保留现有后端 API 与编辑锁定机制（`editLockMiddleware`）不变。
- 前端界面全面重构，严格遵循 `DESIGN.md` 的 warm-editorial 视觉系统。
- 所有 CRUD 操作改为**强制内联**实现：页面内展开、原地编辑、行内表单，**严禁**使用弹窗（Modal）、对话框（Dialog）、抽屉（Drawer）或新开浏览器窗口。
- 新增**团队维度仪表盘**（现有只有产品维度 Dashboard）。
- 建立完整的 Playwright 可测试性规范与前端埋点方案。

**关键里程碑：**

| 里程碑 | 内容 | 预估工期 |
|---|---|---|
| M1 | 设计交付与规范评审 | 2 天 |
| M2 | 前端基础架构搭建（目录重构、CSS 体系、共享组件改造） | 3 天 |
| M3 | CRUD 页面内联编辑重构（People / Teams / Tags / Products / Goals） | 5 天 |
| M4 | 双仪表盘实现（产品维度 + 团队维度） | 2 天 |
| M5 | E2E 测试脚本编写与 UAT 验证 | 3 天 |
| M6 | 埋点接入、回归测试、文档归档 | 2 天 |

### 1.2 任务分解

**M1 — 设计交付**
- [ ] 完成并评审本文档（4个部分的完整设计方案）。
- [ ] 与产品/业务方确认团队维度仪表盘的核心指标。

**M2 — 前端基础架构**
- [ ] 按 1.4 节目录结构迁移文件。
- [ ] 重写 `style.css` 为 CSS 变量驱动，完整映射 `DESIGN.md` Token。
- [ ] 改造 `components.js`：移除 `showModal` 函数，新增内联编辑所需的共享组件（`InlineForm`, `ExpandableRow`, `InlineConfirm`）。
- [ ] 改造 `api.js`：新增 `LockedError` 的统一拦截与内联提示（toast + 行内错误条）。

**M3 — CRUD 内联重构**
- [ ] **Tags**：行内创建、行内编辑（value 字段）、行内删除确认。
- [ ] **Teams**：行内创建、行内编辑（name + 标签多选）、行内删除确认。
- [ ] **People**：表格行内创建（首行展开表单）、行内编辑（所有字段）、行内删除。
- [ ] **Products（L1/L2）**：树形展开内联编辑，L1 卡片内展开 L2 列表，L2 行内编辑。
- [ ] **Goals（L0/L1/L2）**：Tab 切换下，每种目标的行内创建/编辑/删除，目标关联的内联选择器。

**M4 — 双仪表盘**
- [ ] 产品维度仪表盘（保留现有功能，视觉升级）。
- [ ] 团队维度仪表盘（新增）：团队 → 人员 → 产品 → 目标的钻取视图。

**M5 — E2E 测试**
- [ ] 按第 4 部分测试用例编写 Playwright 脚本。
- [ ] 跑通所有关键路径，修复阻断性问题。

**M6 — 埋点与收尾**
- [ ] 接入第 3.6 节定义的前端埋点事件。
- [ ] 全量回归测试。
- [ ] 更新 CLAUDE.md 中的前端章节。

### 1.3 风险点与保守假设

| 风险/假设 | 说明 | 缓解措施 |
|---|---|---|
| **零框架约束** | 当前无构建工具，无法使用 Vue/React 等框架的组件化能力 | 采用基于 class 的 ES6 组件模式（如当前的 `MultiSelect`），手动管理 DOM 生命周期 |
| **编辑锁定中断** | 前端重构不得破坏 `editLockMiddleware` 的现有行为 | 保持 `api.js` 中对 423 状态码的处理不变；所有 mutating 请求仍自动触发锁的获取/续期 |
| **无弹窗约束** | 当前 `showModal` 在 `withLock` 和删除确认中被广泛使用，需完全替换 | 设计内联确认条（Inline Confirm Bar）和全局 Toast 替代 |
| **浏览器兼容性** | 零构建步骤意味着无法自动转译 | 仅使用原生 ES2020 语法（已满足目标环境） |
| **Dashboard 数据量大** | 团队维度仪表盘可能需要聚合大量数据 | 采用懒加载 + 展开式渲染，前端分页与虚拟滚动（若超过 200 行） |

### 1.4 项目目录结构规划

```
www/
├── index.html                  # 产品维度仪表盘（入口页）
├── team-dashboard.html         # 团队维度仪表盘（新增）
├── people.html                 # 人员管理
├── teams.html                  # 团队管理
├── products.html               # 产品管理（L1/L2）
├── goals.html                  # 目标管理（L0/L1/L2 + 关联）
├── tags.html                   # 标签管理
├── admin.html                  # 管理面板（锁状态、备份）
├── css/
│   ├── design-tokens.css       # DESIGN.md 变量映射（新增）
│   ├── base.css                # Reset + 基础排版（新增）
│   ├── components.css          # 共享组件样式：按钮、输入框、表格、卡片（新增）
│   ├── layout.css              # 布局、导航、工具栏、内联编辑器（新增）
│   └── pages/                  # 页面级覆盖（可选）
├── js/
│   ├── api.js                  # fetch 封装 + 锁错误处理（改造）
│   ├── state.js                # 轻量级全局状态（锁状态、当前用户、埋点队列）（新增）
│   ├── components.js           # 共享 UI 组件（改造）
│   ├── analytics.js            # 埋点上报模块（新增）
│   ├── inline-editor.js        # 内联表单/行内编辑通用组件（新增）
│   ├── dashboard.js            # 产品维度仪表盘（改造）
│   ├── team-dashboard.js       # 团队维度仪表盘（新增）
│   ├── people.js               # 人员页面逻辑（改造）
│   ├── teams.js                # 团队页面逻辑（改造）
│   ├── products.js             # 产品页面逻辑（改造）
│   ├── goals.js                # 目标页面逻辑（改造）
│   ├── tags.js                 # 标签页面逻辑（改造）
│   └── admin.js                # 管理页面逻辑（改造）
└── assets/
    └── icons/                  # SVG 图标（若需要）
```

### 1.5 前端开发规范

#### 1.5.1 代码风格

- **语言**：原生 ES2020，不使用 TypeScript（与现有后端区分，保持零构建）。
- **缩进**：2 空格。
- **引号**：单引号用于字符串，模板字符串用于 HTML。
- **变量命名**：
  - DOM 元素：`$button`, `$container`（前缀 `$` 表示 DOM 节点）。
  - 纯数据：`userList`, `selectedIds`（camelCase）。
  - 常量：`API_BASE`, `MAX_RETRY`（UPPER_SNAKE_CASE）。
- **函数**：优先使用 `async function`，事件处理器以 `handle` 为前缀（如 `handleSave`）。
- **HTML 生成**：所有动态 HTML 必须通过 `escHtml()` 转义，禁止直接 `innerHTML = userInput`。

#### 1.5.2 组件编写规范（无框架模式）

采用 **Class-based Vanilla Component** 模式：

```javascript
// 每个组件是一个类，管理自己的 DOM 生命周期
class InlineEditor {
  constructor(container, options) {
    this.container = container;
    this.options = options;
    this.state = 'idle'; // idle | editing | saving | error
    this.render();
  }

  render() { /* 根据 this.state 生成 DOM */ }
  destroy() { /* 清理事件监听、子 DOM */ }
}
```

**原则：**
- 组件构造函数接收挂载点 `container`（DOM 元素）和配置对象。
- 组件内部状态变更后调用 `render()` 重绘。
- 组件提供 `destroy()` 方法，页面切换或行销毁时必须调用，防止内存泄漏。
- 事件委托优先于直接绑定，减少监听器数量。

#### 1.5.3 状态管理

使用轻量级 **Observer Pattern**：

```javascript
// js/state.js
const AppState = {
  lock: { locked: false, holderIp: null, isOwn: false },
  currentPage: '',
  analyticsQueue: [],
  listeners: new Map(),
  subscribe(key, fn) { /* ... */ },
  set(key, value) { this[key] = value; this.notify(key); },
};
```

- **全局状态**仅包含：锁状态、当前页面标识、埋点队列。
- **页面级状态**由各页面 JS 文件自行管理（如 `people.js` 中的 `people`, `teams` 数组）。
- 禁止跨页面直接访问彼此的状态变量；数据通过 `api.js` 重新获取。

#### 1.5.4 API 调用规范

- 所有请求必须通过 `api.request()` 或其封装（`api.get/post/put/delete`）。
- mutating 操作（POST/PUT/DELETE）必须包裹在 `withLock` 中（已由 `api.js` 统一处理 423 响应）。
- 前端在收到 423 后，**不得**弹窗，改为：
  1. 在操作按钮附近显示行内错误文本（`data-testid="inline-error"`）。
  2. 同时触发全局 Toast：`showToast('系统正在编辑中，请稍后', 'warning')`。

#### 1.5.5 CSS 架构

- **BEM-like 命名**：块-元素用双下划线（`l1-card__header`），修饰符用双连字符（`l1-card--expanded`）。
- **禁止行内样式**：除了动态计算的 `width` / `display` 等，其余全部使用 class。
- **变量优先**：所有颜色、间距、圆角必须使用 `css/design-tokens.css` 中的 CSS 变量。

#### 1.5.6 data-testid 命名规范（概要）

详见第 3.5 节完整规范。核心原则：
- 全局唯一，语义化，使用 kebab-case。
- 格式：`[页面]-[元素类型]-[作用]-[状态]`，如 `people-row-edit-btn`。
- 所有可交互元素必须有 `data-testid`；纯展示元素可选。

---

## 第2部分：后端 UAT 测试用例文档

### 2.1 测试策略概述

后端 UAT 重点验证：
1. **CRUD 基本功能**：每个 DDD 模型的创建、读取、更新、删除符合 API 契约。
2. **数据完整性**：删除操作不产生孤儿数据（Orphan Data）；创建/更新不产生垃圾数据（Junk Data）。
3. **引用一致性**：外键约束、级联删除/置空行为与 schema 定义一致。
4. **业务规则**：唯一性约束、自引用禁止、必填字段校验。

**测试方法**：
- 使用现有测试框架（Vitest + supertest）对 `/api/*` 端点进行集成测试。
- 每个测试用例在操作后查询数据库，断言中间表/关联表状态。
- 使用 `test/helpers.ts` 中的 factory 函数构造依赖数据。

### 2.2 Organization Context — Tag

| ID | 场景 | 步骤 | 预期结果 | 孤儿/垃圾数据验证 |
|---|---|---|---|---|
| TAG-001 | 创建标签 | POST `/api/tags` `{value:"前端"}` | 201，返回 tag 对象，id 以 `tag-` 开头 | 验证 `tags` 表存在该行，无其他表受影响 |
| TAG-002 | 创建重复标签 | 已存在 `"前端"`，再次创建 | 409 Conflict，消息包含"已存在" | 验证 `tags` 表仅存在一行 `"前端"` |
| TAG-003 | 更新标签 | PUT `/api/tags/{id}` `{value:"前端开发"}` | 200，value 更新 | 验证 `tags.value` 已更新；验证 `team_tags` / `person_tags` 中关联记录未丢失 |
| TAG-004 | 更新为已存在值 | 将 A 更新为 B 的 value | 409 Conflict | 验证 A 的 value 未被修改 |
| TAG-005 | 删除无引用标签 | DELETE `/api/tags/{id}`（无 team/person 引用） | 200，`{deleted:true}` | 验证 `tags` 表无该行；验证 `team_tags` / `person_tags` 无相关行 |
| TAG-006 | 删除被引用标签 | tag 被某 team 和 person 引用 | 200，`{deleted:true}` | **关键**：验证 `team_tags` 中相关行因 `ON DELETE CASCADE` 自动删除；验证 `person_tags` 中相关行自动删除；验证 team 和 person 本体仍存在（只是去除了标签关联） |

### 2.3 Organization Context — Team

| ID | 场景 | 步骤 | 预期结果 | 孤儿/垃圾数据验证 |
|---|---|---|---|---|
| TEAM-001 | 创建团队 | POST `/api/teams` `{name:"支付组", tagIds:["tag-a"]}` | 201，返回 team 含 tagIds | 验证 `teams` 表有该行；验证 `team_tags` 有映射行 |
| TEAM-002 | 创建团队含无效 tagId | `tagIds` 中包含不存在的 tag | 201 成功，但无效 tagId 被静默过滤 | 验证 `team_tags` 仅包含有效 tagId（无垃圾关联） |
| TEAM-003 | 更新团队名称和标签 | PUT `/api/teams/{id}` `{name:"支付平台", tagIds:["tag-b"]}` | 200 | 验证 `teams.name` 已更新；验证 `team_tags` 旧映射已全删，仅余新映射 |
| TEAM-004 | 删除团队（级联影响） | Team 下有人员，Team 被 L1Product 引用 | 200 | **关键**：验证 `people.team_id` 因 `ON DELETE SET NULL` 被置 NULL；验证 `l1_products.team_id` 被置 NULL；验证 `team_tags` 相关行被 CASCADE 删除；人员和产品本体不被删除 |
| TEAM-005 | 删除不存在团队 | DELETE `/api/teams/not-exist` | 404 NotFound | 无数据变更 |

### 2.4 Organization Context — Person

| ID | 场景 | 步骤 | 预期结果 | 孤儿/垃圾数据验证 |
|---|---|---|---|---|
| PER-001 | 创建人员（完整字段） | POST `/api/people` 含 name/employeeId/level/teamId/location/managerId/tagIds/l1ProductIds/l2ProductIds | 201，返回 person 含全部关联数组 | 验证 `people` 表有行；验证 `person_tags` / `person_l1_products` / `person_l2_products` 各有正确映射 |
| PER-002 | 创建人员时 managerId 指向自己 | `managerId` 等于自身 id | 400 ValidationError | 创建失败，`people` 表无新行 |
| PER-003 | 创建人员时 managerId 不存在 | `managerId` 指向不存在的 person | 400 ValidationError | 创建失败 |
| PER-004 | 更新人员关联（全量替换） | PUT `/api/people/{id}` `{tagIds:[...], l1ProductIds:[...], l2ProductIds:[...]}` | 200 | 验证中间表旧映射被完全删除，仅保留新映射；无孤儿关联 |
| PER-005 | 删除人员 | DELETE `/api/people/{id}` | 200 | **关键**：验证 `person_tags`、`person_l1_products`、`person_l2_products`、`l1_product_owners`、`l2_product_owners` 中所有以此 person_id 为外键的行均被 CASCADE 删除；验证其他人员不受影响；验证 `people.manager_id` 指向被删人员的行被 SET NULL |
| PER-006 | 删除人员后其下级 manager 字段 | 人员 A 是 B 的 manager，删除 A | 200 | 验证 B 的 `manager_id` 已变为 NULL |

### 2.5 Product Context — L1Product

| ID | 场景 | 步骤 | 预期结果 | 孤儿/垃圾数据验证 |
|---|---|---|---|---|
| L1-001 | 创建 L1 产品 | POST `/api/products/l1` `{name:"支付宝", code:"ALIPAY", teamId:"team-1", ownerIds:["p-1"]}` | 201 | 验证 `l1_products` 有行；验证 `l1_product_owners` 有映射 |
| L1-002 | 创建重复 code | code 已存在 | 409 Conflict | 无新行插入 |
| L1-003 | 更新 L1（含 ownerIds 替换） | PUT `{ownerIds:["p-2"]}` | 200 | 验证 `l1_product_owners` 旧 owner 全删，仅 p-2 |
| L1-004 | 删除 L1 产品（级联验证） | DELETE `/api/products/l1/{id}` | 200 | **关键**：验证 `l2_products` 中 `l1_id = 该id` 的行被 CASCADE 删除；验证 `l1_product_owners` 被 CASCADE 删除；验证 `l1_goals` 被 CASCADE 删除；验证 `person_l1_products` 被 CASCADE 删除；验证 `people` / `teams` 不受影响 |
| L1-005 | 删除 L1 后 L2 的 owner 关联 | L1 下有 L2，L2 有 owner | 删除 L1 | 验证 `l2_products` 被删 → `l2_product_owners` 被 CASCADE 删除 → 无孤儿 |

### 2.6 Product Context — L2Product

| ID | 场景 | 步骤 | 预期结果 | 孤儿/垃圾数据验证 |
|---|---|---|---|---|
| L2-001 | 创建 L2 产品 | POST `/api/products/l2` `{l1Id:"l1-1", name:"转账", code:"TRANS", ownerIds:["p-1"]}` | 201 | 验证 `l2_products` 有行；`l2_product_owners` 有映射 |
| L2-002 | 创建 L2 时 l1Id 不存在 | `l1Id:"not-exist"` | 404 NotFound | 无新行插入 |
| L2-003 | 更新 L2 所属 L1 | PUT `{l1Id:"l1-2"}` | 200 | 验证 `l2_products.l1_id` 已更新 |
| L2-004 | 更新 L2 所属 L1 为不存在 | `l1Id:"not-exist"` | 404 | 无数据变更 |
| L2-005 | 删除 L2 产品 | DELETE `/api/products/l2/{id}` | 200 | **关键**：验证 `l2_product_owners`、`person_l2_products`、`l2_goals` 均被 CASCADE 删除；上级 L1 不受影响 |

### 2.7 Goal Context — L0Goal / L1Goal / L2Goal

| ID | 场景 | 步骤 | 预期结果 | 孤儿/垃圾数据验证 |
|---|---|---|---|---|
| GL0-001 | 创建 L0 目标并关联 L1 | POST `/api/goals/l0` `{content:"降本", l1GoalIds:["g1-a"]}` | 201 | 验证 `l0_goals` 有行；`l0_goal_l1_goals` 有映射 |
| GL0-002 | 更新 L0 替换 l1GoalIds | PUT `{l1GoalIds:["g1-b"]}` | 200 | 验证 `l0_goal_l1_goals` 旧映射全删，仅 g1-b |
| GL0-003 | 删除 L0 目标 | DELETE `/api/goals/l0/{id}` | 200 | 验证 `l0_goal_l1_goals` 中相关行被 CASCADE 删除；L1Goal 本体不受影响 |
| GL1-001 | 创建 L1 目标 | POST `/api/goals/l1` `{l1ProductId:"l1-1", content:"提升稳定性", l0GoalIds:["g0-a"], l2GoalIds:["g2-a"]}` | 201 | 验证 `l1_goals` 有行；`l0_goal_l1_goals` 和 `l1_goal_l2_goals` 有映射 |
| GL1-002 | 删除 L1 目标 | DELETE | 200 | **关键**：验证 `l0_goal_l1_goals` 和 `l1_goal_l2_goals` 均被 CASCADE 删除；验证若某 L0 仅关联此 L1，则 L0 下显示为空列表但仍存在 |
| GL2-001 | 创建 L2 目标 | POST `/api/goals/l2` `{l2ProductId:"l2-1", content:"接口优化", l1GoalIds:["g1-a"]}` | 201 | 验证 `l2_goals` 有行；`l1_goal_l2_goals` 有映射 |
| GL2-002 | 删除 L2 目标 | DELETE | 200 | 验证 `l1_goal_l2_goals` 中相关行被 CASCADE 删除；L1Goal 本体不受影响 |

### 2.8 Goal Linking API

| ID | 场景 | 步骤 | 预期结果 | 孤儿/垃圾数据验证 |
|---|---|---|---|---|
| LINK-001 | 关联 L0 → L1 | POST `/api/goals/l0/{id}/l1-goals` `{l1GoalId:"g1-a"}` | 200/201 | 验证 `l0_goal_l1_goals` 有映射；重复关联不报错（INSERT OR IGNORE） |
| LINK-002 | 解除 L0 → L1 | DELETE `/api/goals/l0/{id}/l1-goals/g1-a` | 200 | 验证 `l0_goal_l1_goals` 中该行已删除 |
| LINK-003 | 关联 L1 → L2 | POST `/api/goals/l1/{id}/l2-goals` | 200/201 | 验证 `l1_goal_l2_goals` 有映射 |
| LINK-004 | 解除 L1 → L2 | DELETE `/api/goals/l1/{id}/l2-goals/{l2Id}` | 200 | 验证映射行已删除 |

### 2.9 Dashboard & Admin

| ID | 场景 | 步骤 | 预期结果 | 备注 |
|---|---|---|---|---|
| DASH-001 | Dashboard 聚合正确性 | 创建 L1→L2→人员→目标后 GET `/api/dashboard` | 返回的 metrics 与手动计算一致 | `peopleCount` = 去重后的 L1 owner + participant；`coveragePercent` = L2 人员数 / L1 人员数 |
| DASH-002 | Dashboard 过滤器 | 带 `teamId` / `location` 查询 | 返回数据仅包含匹配项 | location 过滤同时作用于 L2 下的人员列表 |
| ADM-001 | 锁状态查询 | GET `/api/admin/status` | 返回 lock 状态，含 `isOwn` 字段 | 同一 IP 续期锁后 `isOwn = true` |
| ADM-002 | 强制释放锁 | DELETE `/api/admin/lock` | 200，锁释放 | 后续 mutating 请求可获取新锁 |
| ADM-003 | 备份创建 | POST `/api/admin/backup` | 201，返回备份文件名 | 文件存在于 `data/backups/` |

---

## 第3部分：前端界面设计方案

### 3.1 架构概览

#### 3.1.1 技术栈建议

| 层级 | 技术选择 | 理由 |
|---|---|---|
| 构建工具 | **无** | 与现有架构保持一致，零配置、零依赖 |
| 语言 | 原生 ES2020 | 现代浏览器原生支持，无需 Babel |
| 样式 | 原生 CSS + CSS 变量 | `DESIGN.md` 的 Token 直接映射为 CSS 变量，便于主题一致性 |
| DOM 操作 | 原生 DOM API | 数据量不大（管理端系统），无需虚拟 DOM |
| 状态管理 | 轻量级 Observer（`js/state.js`） | 仅管理锁状态、埋点队列等跨页面全局状态 |
| 图表/可视化 | 原生 HTML/CSS（进度条、计数卡片） | 仪表盘无需复杂图表库，用 CSS 进度条和卡片即可满足 |

#### 3.1.2 组件树（逻辑视图）

```
App
├── TopNav (所有页面共享)
│   ├── NavBrand
│   ├── NavLinks (dashboard, people, teams, products, goals, tags, admin)
│   └── LockIndicator
├── PageContent
│   ├── Toolbar
│   │   ├── PageTitle
│   │   ├── Filters (输入框、下拉框、标签筛选)
│   │   ├── SortControls
│   │   └── PrimaryActions (添加按钮)
│   ├── DataView
│   │   ├── TableView (People / Teams / Tags / Goals)
│   │   │   ├── TableHeader (含排序)
│   │   │   ├── TableRow (展示态)
│   │   │   └── InlineEditRow (编辑态) ← 内联编辑核心
│   │   ├── TreeView (Products)
│   │   │   ├── L1Card (可展开)
│   │   │   │   ├── L1Header
│   │   │   │   ├── L1EditForm (内联)
│   │   │   │   └── L2List
│   │   │   │       ├── L2Row
│   │   │   │       └── L2EditForm (内联)
│   │   │   └── InlineCreateL1 (首行或底部)
│   │   └── DashboardView
│   │       ├── FilterBar
│   │       ├── MetricCards
│   │       └── DrillDownTree
│   └── EmptyState
└── ToastContainer (全局)
```

#### 3.1.3 数据流方案

采用 **"服务器为源 truth，前端本地缓存"** 的轻量级数据流：

1. 页面加载时，通过 `api.get()` 拉取该页所需的全部关联数据（如 People 页同时拉取 `/people`, `/teams`, `/tags`, `/products/l1`, `/products/l2`）。
2. 数据存入页面级变量（如 `let people = []`），不存入全局状态。
3. 用户触发 mutating 操作后：
   - 前端立即发送请求。
   - 成功后重新 `load()` 全量数据并 `render()`。
   - **不采用乐观更新**（保守策略，避免锁冲突下的数据不一致）。
4. 编辑锁定状态由 `js/state.js` 订阅 `/api/admin/status` 轮询（每 30 秒），通过 `TopNav.LockIndicator` 展示。

### 3.2 页面详细设计

#### 3.2.1 全局布局规则（所有页面）

- **TopNav**：固定在顶部，64px 高，cream 背景，底部 1px hairline 边框。遵循 `DESIGN.md` 的 `top-nav` 组件规范。
- **Content 区域**：`max-width: 1200px`，水平居中，`padding: var(--space-xl)`。
- **Toolbar**：每个页面顶部，flex 布局，左侧标题，中间筛选/排序，右侧操作按钮。
- **表格**：`width: 100%`，表头使用 `surface-card` 背景，行分隔线为 1px `hairline`。
- **空状态**：居中展示，图标 + 文字，灰色（`muted`）。

#### 3.2.2 Tags 页面（tags.html）

**布局**：简单表格，2 列（标签值 + 操作）。

**内联创建**：
- 点击"+ 添加标签"后，在表格**首行**插入一个内联表单行（`tr`）。
- 表单行包含：输入框（value）+ 保存按钮（primary）+ 取消按钮（secondary）。
- 输入框获得自动焦点。

**内联编辑**：
- 每行末尾有"编辑"文字链接（`text-link` 样式）。
- 点击后，该行的文本单元格变为输入框，操作列变为保存/取消按钮。
- 按 `Esc` 取消编辑，按 `Enter` 保存。

**内联删除**：
- 每行末尾有"删除"文字链接，颜色为 `error`。
- 点击后，该行背景变为浅红色（`error` 的 5% 透明度），操作列变为"确认删除"（primary-danger 样式）和"取消"按钮。
- **无弹窗确认**。

#### 3.2.3 Teams 页面（teams.html）

**布局**：表格，3 列（团队名称、标签、操作）。

**内联创建**：
- 首行插入表单：名称输入框 + 标签多选（复用 `MultiSelect` 组件，以内联方式嵌入表格单元格）+ 保存/取消。

**内联编辑**：
- 名称变为输入框。
- 标签列变为 `MultiSelect` 组件（当前已选标签以 chip 形式展示，可增删）。

**行展开（查看人员）**：
- 团队名称旁有展开箭头（`▸`），点击后在该行下方展开子区域（非弹窗），列出该团队下的所有人员（只读）。
- 子区域使用 `surface-soft` 背景，与主表格区分。

#### 3.2.4 People 页面（people.html）

**布局**：8 列表格（姓名、工号、职级、团队、所在地、上级、标签、操作）。

**内联创建**：
- 点击"+ 添加人员"，在表格**首行**插入表单行。
- 所有字段使用输入框或下拉框：
  - 姓名、工号、职级、所在地：`text-input`。
  - 团队：下拉选择（从已加载的 teams 数据渲染）。
  - 上级：下拉选择（从已加载的 people 数据渲染，排除自己）。
  - 标签：`MultiSelect`。
  - L1产品、L2产品：`MultiSelect`（从已加载的产品数据渲染）。
- 表单行高度自适应，单元格内垂直排列表单控件。

**内联编辑**：
- 点击行末"编辑"，整行切换为编辑态，各单元格替换为对应输入控件。
- 团队、上级、标签、产品字段在编辑态展示为下拉或多选。

**内联删除**：
- 同 Tags 页面的内联确认机制。

#### 3.2.5 Products 页面（products.html）

**布局**：树形卡片视图（非表格），每个 L1 产品为一个 `feature-card` 风格的卡片。

**L1 卡片结构**：
```
┌─ L1Card (surface-card 背景) ─────────────────────┐
│  ▸ 支付宝 (ALIPAY)          [编辑] [删除] [+L2]  │
│  ───────────────────────────────────────────────  │
│  团队: 支付组 | Owner: 张三, 李四                  │
│  ───────────────────────────────────────────────  │
│  L2 产品列表 (可展开/收起)                        │
│  ├─ 转账 (TRANS)         [编辑] [删除]            │
│  ├─ 收款 (RECEIVE)       [编辑] [删除]            │
│  └─ + 添加 L2 产品 (点击展开内联表单)             │
└───────────────────────────────────────────────────┘
```

**内联编辑 L1**：
- 点击卡片头部的"编辑"，卡片头部区域展开为表单（名称、编码、团队下拉、Owner 多选）。
- 编辑期间卡片微微变亮（`surface-cream-strong` 背景），提示编辑中。

**内联编辑 L2**：
- 每个 L2 行点击"编辑"后，该行变为内联表单（名称、编码、Owner 多选）。
- L2 的所属 L1 在编辑态提供一个下拉框（可迁移到其他 L1）。

**内联创建 L2**：
- 点击"+ 添加 L2 产品"，在 L2 列表**底部**新增一个内联表单行。

#### 3.2.6 Goals 页面（goals.html）

**布局**：顶部 Tab 切换（L0 / L1 / L2），下方为表格。

**Tab 设计**：
- 使用 `DESIGN.md` 的 `category-tab` / `category-tab-active` 样式。
- Tab 切换不刷新页面，仅切换表格数据和表头。

**表格列**：
- L0：内容、衡量标准、关联 L1 目标数、操作。
- L1：内容、衡量标准、所属 L1 产品、关联 L0 数、关联 L2 数、操作。
- L2：内容、衡量标准、所属 L2 产品、关联 L1 数、操作。

**内联创建/编辑/删除**：
- 与 People 页面机制一致。
- **目标关联的内联选择器**：编辑 L0 时，关联 L1 列使用 `MultiSelect`（从当前所有 L1 目标中选择）。编辑 L1 时，关联 L0 和 L2 各用一个 `MultiSelect`。

**目标关联的展开查看**：
- L0 行的"关联 L1 目标数"是一个可点击的链接，点击后在该行下方展开子区域，列出所有关联的 L1 目标内容（只读）。
- 同理 L1 行可展开查看关联的 L2 目标。

#### 3.2.7 Admin 页面（admin.html）

**布局**：信息面板 + 操作按钮。

**内容**：
- 当前锁定状态卡片：显示锁定者 IP、锁定时间、是否自己持有。
- 操作区："强制释放锁"按钮（危险操作，使用 error 颜色按钮）。
- 备份列表：表格展示已有备份文件，支持下载。

**内联确认**：
- "强制释放锁"点击后，按钮旁边出现确认条（"确认释放？ [确认] [取消]"），不弹窗。

### 3.3 仪表盘页面单独详述

#### 3.3.1 产品维度仪表盘（index.html — 现有功能升级）

**视觉升级**：
- 保持现有的 L1 → L2 钻取树形结构。
- 卡片背景统一为 `surface-card`（`#efe9de`）。
- 指标数字使用 `display-sm` 字体（Cormorant Garamond, 28px）。
- 覆盖率进度条使用 `accent-teal`（≥80%）、`accent-amber`（50-80%）、`error`（<50%）三色分级。

**新增交互**：
- 每个 L1 卡片的 header 增加"查看详情"链接，点击后**路由切换**到 `products.html` 并自动展开对应 L1 的编辑视图（通过 URL query `?focus=l1-xxx` 实现）。
- **严禁弹窗展示详情**。

#### 3.3.2 团队维度仪表盘（team-dashboard.html — 新增）

**页面定位**：从"团队"视角出发，展示团队 → 人员 → 产品 → 目标的完整链路。

**布局**：
```
Toolbar: [页面标题: 团队视图] [团队筛选下拉] [地点筛选下拉]

MetricCards 行（3-up 网格）:
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ 团队总数    │ │ 人员总数    │ │ 未分配人员  │
│    12       │ │   156       │ │     8       │
└─────────────┘ └─────────────┘ └─────────────┘

TeamTree（每个团队一个卡片）:
┌─ 支付组 ────────────────────────────────────────┐
│ 人员: 23 | 产品: 3 | 目标: 12                    │
│ ───────────────────────────────────────────────  │
│ ▸ 人员列表 (展开后显示)                          │
│   张三 — 支付宝/转账 — L1目标: 降本增效          │
│   李四 — 支付宝/收款 — L1目标: 降本增效          │
│   王五 — 无产品 — (红色提示)                     │
└───────────────────────────────────────────────────┘
```

**数据需求**：
- 后端现有 `/api/dashboard` 是产品维度的。团队维度仪表盘需要：
  - **保守假设**：现有 `/api/dashboard` 可通过添加 `?view=team` 参数复用，或新建 `/api/dashboard/team`。
  - 由于信息不足，前端设计假设**团队维度数据通过现有 API 组合获取**：前端并行请求 `/api/teams`, `/api/people`, `/api/products/l1`, `/api/goals/l0`, `/api/goals/l1`, `/api/goals/l2`，在浏览器端做聚合计算。
  - 若数据量超过 50 个团队，建议后端新增 `/api/dashboard/team` 接口，但本次前端设计兼容两种模式。

**团队卡片指标**：
| 指标 | 计算方式 |
|---|---|
| 人员数 | 该 team_id 的 people 数量 |
| L1 产品数 | 该 team_id 的 l1_products 数量 |
| L2 产品数 | 这些 L1 下的 L2 数量 |
| 目标总数 | 这些 L1/L2 下的 goals 数量 |
| 未分配产品的人员 | 属于该团队但没有关联任何 L1/L2 产品的人员 |

**人员行展开内容**：
- 姓名 + 职级。
- 参与的 L1 / L2 产品（以 badge 展示）。
- 关联的目标（以 badge 展示）。
- 若人员无产品关联，显示红色提示文字"未分配产品"。

### 3.4 交互与体验规范

#### 3.4.1 路由与导航

- 所有页面跳转使用常规 `<a href="...">`，允许整页刷新（管理端系统，对 SPA 体验要求不高）。
- 仪表盘到详情页的钻取通过 URL query 参数传递上下文（如 `products.html?focus=l1-xxx`），目标页面加载后解析 query 并自动展开对应项。
- 浏览器 Back/Forward 正常可用。

#### 3.4.2 表单交互

- **自动聚焦**：内联表单出现时，第一个输入框自动获得焦点。
- **键盘快捷**：
  - `Enter`：保存（当焦点在输入框时）。
  - `Esc`：取消编辑，恢复展示态。
  - `Tab`：在表单字段间切换。
- **实时校验**：前端对必填字段做即时校验（空值时输入框边框变红），避免无意义的 API 请求。
- **保存中状态**：保存按钮显示为禁用态，文字变为"保存中..."，防止重复提交。

#### 3.4.3 危险操作（删除）

- **无弹窗确认**：采用"内联确认条"模式。
- 点击"删除"后：
  1. 目标行背景变为浅红色。
  2. 操作列变为两个按钮："确认删除"（红色背景白色文字）和"取消"（secondary）。
  3. 3 秒内无操作自动恢复（可选安全机制）。

#### 3.4.4 编辑锁定体验

- **假设**：编辑锁定机制保持现有行为不变（`editLockMiddleware` 自动管理）。
- 前端表现：
  - TopNav 的锁指示器实时显示当前状态（绿色=可编辑，红色=他人锁定中，珊瑚色=自己持有）。
  - 当锁被他人持有时，页面上的所有 mutating 按钮（添加、编辑、删除）添加 `opacity: 0.5` 和 `pointer-events: none` 的遮罩，不可点击。
  - 用户尝试点击被禁用的按钮时，在按钮旁边显示 Tooltip："系统正在由 [IP] 编辑中"。
  - 收到 423 响应时，触发 `showToast('系统正在编辑中，请稍后重试', 'warning')`。

#### 3.4.5 错误处理

- **网络错误**：`showToast('网络异常，请检查连接', 'error')`。
- **业务错误**（4xx）：Toast 展示后端返回的 message；若是行内操作，同时在表单下方显示行内错误文本。
- **锁错误**（423）：特殊处理，见 3.4.4。

### 3.5 Playwright 可测试性设计

#### 3.5.1 data-testid 命名规范

**全局格式**：`[page]-[element-type]-[action/role]-[identifier]`

- 全部使用小写 kebab-case。
- `[page]`：页面简称（`dashboard`, `team-dash`, `people`, `teams`, `products`, `goals`, `tags`, `admin`）。
- `[element-type]`：元素类型（`btn`, `input`, `select`, `row`, `card`, `tab`, `link`, `chip`, `badge`, `toast`, `error`, `form`, `list`, `header`）。
- `[action/role]`：动作或角色（`add`, `edit`, `delete`, `confirm`, `cancel`, `save`, `filter`, `sort`, `expand`, `collapse`, `refresh`, `search`, `empty`, `loading`）。
- `[identifier]`：可选，用于区分同类元素（如 `people-row-edit-btn-p-abc123`）。

**动态 ID 的处理**：
- 对于表格行，在行的容器上放置 `data-testid="people-row-p-abc123"`，其内部的按钮使用相对选择器定位（如 `page.locator('[data-testid="people-row-p-abc123"] [data-testid="row-edit-btn"]')`）。
- 在测试中使用正则匹配动态部分：`>>data-testid^="people-row-">>[data-testid="row-edit-btn"]`。

#### 3.5.2 关键元素 data-testid 映射表

**全局共享**

| 元素 | data-testid |
|---|---|
| TopNav | `top-nav` |
| 导航链接-Dashboard | `nav-link-dashboard` |
| 导航链接-人员 | `nav-link-people` |
| 导航链接-团队 | `nav-link-teams` |
| 导航链接-产品 | `nav-link-products` |
| 导航链接-目标 | `nav-link-goals` |
| 导航链接-标签 | `nav-link-tags` |
| 导航链接-管理 | `nav-link-admin` |
| 锁状态指示点 | `lock-indicator-dot` |
| 锁状态文本 | `lock-indicator-text` |
| Toast 容器 | `toast-container` |
| Toast 成功消息 | `toast-success` |
| Toast 错误消息 | `toast-error` |
| Toast 警告消息 | `toast-warning` |

**People 页面**

| 元素 | data-testid |
|---|---|
| 添加人员按钮 | `people-add-btn` |
| 姓名筛选输入 | `people-filter-name-input` |
| 团队筛选下拉 | `people-filter-team-select` |
| 地点筛选下拉 | `people-filter-location-select` |
| 标签筛选下拉 | `people-filter-tag-select` |
| 人员表格 | `people-table` |
| 表格行（动态 ID） | `people-row-{personId}` |
| 行编辑按钮 | `row-edit-btn` |
| 行删除按钮 | `row-delete-btn` |
| 行确认删除按钮 | `row-confirm-delete-btn` |
| 行取消按钮 | `row-cancel-btn` |
| 内联创建表单行 | `people-inline-create-form` |
| 内联编辑表单行 | `people-inline-edit-form-{personId}` |
| 表单保存按钮 | `form-save-btn` |
| 表单取消按钮 | `form-cancel-btn` |
| 姓名字段输入 | `form-name-input` |
| 工号字段输入 | `form-employee-id-input` |
| 职级字段输入 | `form-level-input` |
| 团队字段下拉 | `form-team-select` |
| 地点字段输入 | `form-location-input` |
| 上级字段下拉 | `form-manager-select` |
| 标签多选容器 | `form-tags-multiselect` |
| L1产品多选容器 | `form-l1-products-multiselect` |
| L2产品多选容器 | `form-l2-products-multiselect` |
| 行内错误文本 | `inline-error-text` |
| 空状态 | `people-empty-state` |
| 人数统计 | `people-count-badge` |
| 表头排序-姓名 | `people-sort-name-header` |
| 表头排序-工号 | `people-sort-employee-id-header` |

**Teams 页面**

| 元素 | data-testid |
|---|---|
| 添加团队按钮 | `teams-add-btn` |
| 团队表格 | `teams-table` |
| 表格行 | `teams-row-{teamId}` |
| 行展开箭头 | `row-expand-btn` |
| 展开的子区域 | `row-expanded-panel` |
| 子区域内人员列表 | `expanded-people-list` |

**Tags 页面**

| 元素 | data-testid |
|---|---|
| 添加标签按钮 | `tags-add-btn` |
| 标签表格 | `tags-table` |
| 表格行 | `tags-row-{tagId}` |
| 标签值输入 | `form-value-input` |

**Products 页面**

| 元素 | data-testid |
|---|---|
| 添加 L1 按钮 | `products-add-l1-btn` |
| L1 卡片 | `products-l1-card-{l1Id}` |
| L1 卡片头部 | `l1-card-header` |
| L1 编辑按钮 | `l1-edit-btn` |
| L1 删除按钮 | `l1-delete-btn` |
| L1 内联编辑表单 | `l1-inline-edit-form` |
| L2 列表 | `l2-list` |
| L2 行 | `l2-row-{l2Id}` |
| 添加 L2 按钮 | `l2-add-btn` |
| L2 编辑按钮 | `l2-edit-btn` |
| L2 删除按钮 | `l2-delete-btn` |
| L2 内联创建表单 | `l2-inline-create-form` |
| L2 内联编辑表单 | `l2-inline-edit-form` |
| L1 名称输入 | `form-l1-name-input` |
| L1 编码输入 | `form-l1-code-input` |
| L1 团队下拉 | `form-l1-team-select` |
| L1 Owner 多选 | `form-l1-owners-multiselect` |
| L2 名称输入 | `form-l2-name-input` |
| L2 编码输入 | `form-l2-code-input` |
| L2 Owner 多选 | `form-l2-owners-multiselect` |

**Goals 页面**

| 元素 | data-testid |
|---|---|
| L0 Tab | `goals-l0-tab` |
| L1 Tab | `goals-l1-tab` |
| L2 Tab | `goals-l2-tab` |
| 添加目标按钮 | `goals-add-btn` |
| 目标表格 | `goals-table` |
| 表格行 | `goals-row-{goalId}` |
| 内容输入 | `form-content-input` |
| 衡量标准输入 | `form-standard-input` |
| 所属产品下拉 | `form-product-select` |
| 关联目标多选 | `form-linked-goals-multiselect` |
| 关联展开区域 | `linked-goals-panel` |

**Dashboard（产品维度）**

| 元素 | data-testid |
|---|---|
| 团队筛选 | `dash-filter-team-select` |
| 地点筛选 | `dash-filter-location-select` |
| 刷新按钮 | `dash-refresh-btn` |
| L1 卡片 | `dash-l1-card-{l1Id}` |
| L1 展开按钮 | `dash-l1-expand-btn` |
| L1 详情区域 | `dash-l1-detail-panel` |
| 指标-L2 数量 | `dash-metric-l2-count` |
| 指标-人员数量 | `dash-metric-people-count` |
| 指标-目标数量 | `dash-metric-goal-count` |
| 指标-覆盖率 | `dash-metric-coverage` |
| 覆盖率进度条 | `dash-coverage-bar` |
| L2 展开按钮 | `dash-l2-expand-btn` |
| L2 详情区域 | `dash-l2-detail-panel` |
| 空状态 | `dash-empty-state` |

**Team Dashboard（团队维度 — 新增）**

| 元素 | data-testid |
|---|---|
| 团队筛选 | `team-dash-filter-team-select` |
| 地点筛选 | `team-dash-filter-location-select` |
| 团队总数卡片 | `team-dash-metric-team-count` |
| 人员总数卡片 | `team-dash-metric-people-count` |
| 未分配人员卡片 | `team-dash-metric-unassigned-count` |
| 团队卡片 | `team-dash-card-{teamId}` |
| 团队卡片展开按钮 | `team-card-expand-btn` |
| 人员行 | `team-card-person-row-{personId}` |
| 未分配产品提示 | `team-card-unassigned-warning` |

**Admin 页面**

| 元素 | data-testid |
|---|---|
| 锁状态卡片 | `admin-lock-status-card` |
| 锁持有者 IP | `admin-lock-holder-ip` |
| 强制释放按钮 | `admin-force-release-btn` |
| 释放确认按钮 | `admin-confirm-release-btn` |
| 释放取消按钮 | `admin-cancel-release-btn` |
| 创建备份按钮 | `admin-backup-btn` |
| 备份表格 | `admin-backups-table` |
| 备份下载链接 | `admin-backup-download-link` |

### 3.6 前端埋点方案

#### 3.6.1 埋点架构

- **采集方式**：前端主动上报，使用内存队列 + `navigator.sendBeacon`（页面卸载时刷新）。
- **不上报第三方服务**：埋点数据先暂存于前端，后续可批量导出或接入内部系统。
- **模块**：`js/analytics.js` 提供 `track(event, properties)` 函数。

#### 3.6.2 关键事件定义

| 事件名 | 触发时机 | 属性 |
|---|---|---|
| `page_view` | 页面加载完成 | `page` (页面标识), `referrer` |
| `list_filter` | 用户变更筛选条件后 | `page`, `filter_key`, `filter_value` |
| `list_sort` | 用户点击表头排序 | `page`, `sort_key`, `sort_direction` |
| `entity_create_start` | 点击"添加"按钮，内联表单出现 | `page`, `entity_type` |
| `entity_create_submit` | 点击保存（创建） | `page`, `entity_type` |
| `entity_create_success` | 创建 API 成功返回 | `page`, `entity_type`, `entity_id` |
| `entity_create_fail` | 创建 API 失败 | `page`, `entity_type`, `error_code` |
| `entity_update_start` | 点击"编辑"按钮 | `page`, `entity_type`, `entity_id` |
| `entity_update_submit` | 点击保存（更新） | `page`, `entity_type`, `entity_id` |
| `entity_update_success` | 更新 API 成功返回 | `page`, `entity_type`, `entity_id` |
| `entity_update_fail` | 更新 API 失败 | `page`, `entity_type`, `entity_id`, `error_code` |
| `entity_delete_start` | 点击"删除"按钮 | `page`, `entity_type`, `entity_id` |
| `entity_delete_confirm` | 点击"确认删除" | `page`, `entity_type`, `entity_id` |
| `entity_delete_success` | 删除 API 成功返回 | `page`, `entity_type` |
| `entity_delete_cancel` | 点击"取消"删除 | `page`, `entity_type`, `entity_id` |
| `expand_row` | 展开行/卡片详情 | `page`, `entity_type`, `entity_id` |
| `collapse_row` | 收起行/卡片详情 | `page`, `entity_type`, `entity_id` |
| `lock_acquired` | 当前用户获得编辑锁 | `holder_ip` |
| `lock_denied` | 当前用户操作因锁被拒绝 | `holder_ip` |
| `dashboard_drill_down` | 仪表盘钻取到详情页 | `from_page`, `to_page`, `entity_type`, `entity_id` |
| `backup_create` | 创建备份 | `filename` |

#### 3.6.3 界面状态埋点

- **锁状态变化**：每次轮询 `/api/admin/status` 后，若锁状态发生变化（从 unlocked → locked，或 holder 变更），触发 `lock_state_changed` 事件。
- **表单停留时长**：`entity_create_start` 到 `entity_create_submit` 的间隔，在 `entity_create_submit` 事件中附加 `duration_ms`。

---

## 第4部分：E2E UAT 测试用例文档 (Playwright)

### 4.1 测试环境与前置条件

- **测试框架**：Playwright（`@playwright/test`）。
- **基础 URL**：`http://localhost:8888`（开发服务器）。
- **前置数据**：每个测试文件在 `beforeAll` 中通过直接调用 API 或执行 SQL seed 创建必要的测试数据（团队、产品、人员、目标）。
- **测试隔离**：每个测试用例结束后清理数据（通过 API 删除测试实体，或重启内存数据库实例）。
- **浏览器**：Chromium（主），Firefox + WebKit（回归套件的子集）。

### 4.2 全局 Setup 与辅助函数

```typescript
// tests/e2e/helpers.ts
import { Page, expect } from '@playwright/test';

export async function loginAsAdmin(page: Page) {
  // 本系统无鉴权，直接访问页面即可
}

export async function createTestData() {
  // 通过 API 创建：1个团队、2个标签、2个人、1个L1产品含1个L2、1个L0目标
}

export async function clearTestData() {
  // 按依赖反序删除：goals → products → people → teams → tags
}

export async function waitForToast(page: Page, type: 'success' | 'error' | 'warning') {
  await page.waitForSelector(`[data-testid="toast-${type}"]`);
}

export async function openInlineCreate(page: Page, testId: string) {
  await page.click(`[data-testid="${testId}"]`);
  await page.waitForSelector('[data-testid="inline-form"]', { state: 'visible' });
}
```

### 4.3 测试用例：导航与全局功能

| ID | 用例名 | 步骤 | 断言 |
|---|---|---|---|
| NAV-001 | 顶部导航跳转 | 1. 在 Dashboard 页<br>2. 依次点击 people、teams、products、goals、tags、admin 导航链接 | 每个链接点击后 URL 正确变更，对应页面标题出现 |
| NAV-002 | 锁状态指示器-可编辑 | 1. 确保无其他用户持有锁<br>2. 查看 TopNav 锁指示器 | `data-testid="lock-indicator-dot"` 为绿色；文本为"可编辑" |
| NAV-003 | 锁状态指示器-他人锁定 | 1. 从另一个 IP/浏览器获取锁（模拟）<br>2. 查看当前页面锁指示器 | 锁指示点为红色；文本包含持有者 IP；mutating 按钮被禁用（`pointer-events: none`） |
| NAV-004 | 强制释放锁 | 1. 在 Admin 页点击"强制释放锁"<br>2. 点击确认按钮 | 锁状态变为"可编辑"；Toast 提示释放成功 |

### 4.4 测试用例：Tags CRUD

| ID | 用例名 | 步骤 | 断言 |
|---|---|---|---|
| TAG-E2E-001 | 创建标签 | 1. 进入 Tags 页<br>2. 点击 `tags-add-btn`<br>3. 在 `form-value-input` 输入"后端架构"<br>4. 点击 `form-save-btn` | Toast 成功；表格新增一行；该行的文本为"后端架构" |
| TAG-E2E-002 | 创建重复标签 | 1. 已存在"后端架构"<br>2. 再次执行创建流程，输入相同值<br>3. 点击保存 | Toast 错误（409）；表格行数未增加；`inline-error-text` 显示"已存在" |
| TAG-E2E-003 | 编辑标签 | 1. 找到已有标签行<br>2. 点击 `row-edit-btn`<br>3. 修改输入框值为"后端架构组"<br>4. 点击保存 | 该行文本变为"后端架构组"；无弹窗出现 |
| TAG-E2E-004 | 取消编辑标签 | 1. 点击某行的编辑<br>2. 修改输入框<br>3. 按 `Esc` | 输入框消失，恢复原始文本展示 |
| TAG-E2E-005 | 删除标签 | 1. 找到目标标签行<br>2. 点击 `row-delete-btn`<br>3. 点击 `row-confirm-delete-btn` | 该行从表格消失；Toast 成功；验证数据库 `tags` 表和 `team_tags` / `person_tags` 中无该标签关联 |
| TAG-E2E-006 | 取消删除标签 | 1. 点击删除<br>2. 点击 `row-cancel-btn` | 行背景恢复；该行仍存在于表格 |

### 4.5 测试用例：Teams CRUD

| ID | 用例名 | 步骤 | 断言 |
|---|---|---|---|
| TEAM-E2E-001 | 创建团队带标签 | 1. 进入 Teams 页<br>2. 点击添加<br>3. 输入名称"风控组"<br>4. 在 `form-tags-multiselect` 中选择已有标签<br>5. 保存 | 表格新增"风控组"行；该行显示对应标签 chip |
| TEAM-E2E-002 | 编辑团队标签 | 1. 点击某团队编辑<br>2. 移除一个标签 chip，新增另一个<br>3. 保存 | 该行标签展示已更新；数据库 `team_tags` 同步更新 |
| TEAM-E2E-003 | 删除团队级联验证 | 1. 创建团队 T，添加人员 P（P 的 team_id = T）<br>2. 删除团队 T | Toast 成功；进入 People 页，验证 P 的团队字段已变为空（NULL）；无人员被删除 |
| TEAM-E2E-004 | 展开团队查看人员 | 1. 在 Teams 页点击某行的 `row-expand-btn`<br>2. 查看展开的 `row-expanded-panel` | 面板内列出该团队所有人员姓名；再次点击收起 |

### 4.6 测试用例：People CRUD

| ID | 用例名 | 步骤 | 断言 |
|---|---|---|---|
| PER-E2E-001 | 创建完整人员 | 1. 进入 People 页<br>2. 点击 `people-add-btn`<br>3. 填写所有字段（姓名、工号、职级、团队、地点、上级、标签、L1/L2 产品）<br>4. 保存 | 表格首行新增该人员；所有字段展示正确；数据库 `person_tags` / `person_l1_products` / `person_l2_products` 均有正确映射 |
| PER-E2E-002 | 创建人员-上级指向自己 | 1. 创建人员时，在 `form-manager-select` 中选择自己（若可选）或输入自己 ID | 保存失败；`inline-error-text` 显示"不能引用自身" |
| PER-E2E-003 | 筛选人员 | 1. 在 `people-filter-name-input` 输入已有人员姓名的部分字符<br>2. 等待自动筛选（或按 Enter） | 表格仅显示匹配姓名的人员 |
| PER-E2E-004 | 排序人员 | 1. 点击 `people-sort-name-header`<br>2. 再次点击 | 第一次点击按姓名升序；第二次点击降序；箭头方向正确 |
| PER-E2E-005 | 编辑人员更换团队 | 1. 点击某人员编辑<br>2. 修改 `form-team-select`<br>3. 保存 | 该人员的团队列展示新团队名 |
| PER-E2E-006 | 删除人员级联验证 | 1. 删除人员 P（P 是某 L1 产品的 owner）<br>2. 进入 Products 页查看该产品 | P 不再出现在 Owner 列表中；产品本身未被删除；数据库中间表无 P 的关联 |
| PER-E2E-007 | 标签筛选 | 1. 在 `people-filter-tag-select` 选择某个标签<br>2. 等待筛选 | 仅显示拥有该标签的人员 |

### 4.7 测试用例：Products CRUD

| ID | 用例名 | 步骤 | 断言 |
|---|---|---|---|
| PROD-E2E-001 | 创建 L1 产品 | 1. 进入 Products 页<br>2. 点击 `products-add-l1-btn`<br>3. 填写名称、编码、团队、Owner<br>4. 保存 | 页面新增 L1 卡片；卡片头部显示名称和编码 |
| PROD-E2E-002 | 创建 L2 产品 | 1. 在某 L1 卡片中点击 `l2-add-btn`<br>2. 填写 L2 名称、编码、Owner<br>3. 保存 | 该 L1 的 L2 列表新增一行；无弹窗 |
| PROD-E2E-003 | 编辑 L1 内联 | 1. 点击 L1 卡片的 `l1-edit-btn`<br>2. 卡片头部变为表单<br>3. 修改名称<br>4. 保存 | 卡片头部展示新名称；表单消失 |
| PROD-E2E-004 | 编辑 L2 内联 | 1. 点击某 L2 行的 `l2-edit-btn`<br>2. 该行变为表单<br>3. 修改编码<br>4. 保存 | 该行展示新编码 |
| PROD-E2E-005 | 删除 L1 级联验证 | 1. 创建 L1（含 L2、L1Goals）<br>2. 删除该 L1 | L1 卡片消失；进入 Goals 页，验证该 L1 下的 L1Goals 已消失；数据库 `l2_products` / `l1_goals` / 中间表无该 L1 相关数据 |
| PROD-E2E-006 | 排序 L1 产品 | 1. 在 `sortBy` 下拉选择"按团队"<br>2. 观察卡片顺序 | 卡片按团队名称分组排序 |

### 4.8 测试用例：Goals CRUD

| ID | 用例名 | 步骤 | 断言 |
|---|---|---|---|
| GOAL-E2E-001 | Tab 切换 | 1. 进入 Goals 页<br>2. 点击 `goals-l1-tab`<br>3. 点击 `goals-l2-tab` | 每次切换后表格数据正确更新；表头列随之变化 |
| GOAL-E2E-002 | 创建 L0 目标 | 1. 确保在 L0 Tab<br>2. 点击添加<br>3. 输入内容、衡量标准<br>4. 保存 | 表格新增 L0 行 |
| GOAL-E2E-003 | 创建 L1 目标并关联 L0 | 1. 切换到 L1 Tab<br>2. 点击添加<br>3. 选择所属 L1 产品<br>4. 输入内容<br>5. 在 `form-linked-goals-multiselect` 中选择 L0 目标<br>6. 保存 | 表格新增 L1 行；展开关联区域可见已关联的 L0 内容 |
| GOAL-E2E-004 | 关联 L0 → L1 | 1. 已有 L0 和 L1<br>2. 进入 L0 行编辑<br>3. 修改关联 L1 多选框，新增一个 L1<br>4. 保存 | 该 L0 的关联 L1 数 +1；数据库 `l0_goal_l1_goals` 有新增行 |
| GOAL-E2E-005 | 解除 L1 → L2 关联 | 1. 已有 L1 关联了 L2<br>2. 进入 L1 行编辑<br>3. 从多选框移除该 L2<br>4. 保存 | 该 L1 的关联 L2 数 -1；数据库对应行已删除 |
| GOAL-E2E-006 | 删除 L1 目标级联 | 1. 删除某个 L1Goal（该 L1Goal 被 L0 关联，且关联了 L2Goals）<br>2. 进入 L0 页查看 | 该 L0 的关联列表中不再包含被删 L1Goal；L2Goals 本身未被删除（仅关联关系被删） |

### 4.9 测试用例：Dashboard（产品维度）

| ID | 用例名 | 步骤 | 断言 |
|---|---|---|---|
| DASH-E2E-001 | 加载 Dashboard | 1. 进入首页（Dashboard）<br>2. 等待加载 | 至少显示一个 L1 卡片；指标数值为非负数 |
| DASH-E2E-002 | 展开 L1 详情 | 1. 点击某 L1 卡片的 `dash-l1-expand-btn` | 卡片下方展开 `dash-l1-detail-panel`，显示 L1Goals 和 L2 列表 |
| DASH-E2E-003 | 展开 L2 详情 | 1. 先展开 L1<br>2. 点击某 L2 的 `dash-l2-expand-btn` | 显示该 L2 的人员和目标 |
| DASH-E2E-004 | 筛选团队 | 1. 在 `dash-filter-team-select` 选择一个团队<br>2. 等待刷新 | 仅显示属于该团队的 L1 卡片 |
| DASH-E2E-005 | 覆盖率计算正确性 | 1. 构造数据：L1 有 2 人，其下 L2 有 1 人（其中 1 人同时属于 L1 和 L2）<br>2. 查看覆盖率 | `dash-metric-coverage` 显示 `50`（1/2） |
| DASH-E2E-006 | 钻取到产品页 | 1. 在 Dashboard 点击某 L1 卡片的"查看详情"链接 | 页面跳转到 `products.html?focus=l1-xxx`；对应 L1 卡片自动展开编辑视图 |
| DASH-E2E-007 | 空状态 | 1. 确保无任何产品数据<br>2. 刷新 Dashboard | 显示 `dash-empty-state` |

### 4.10 测试用例：Team Dashboard（团队维度 — 新增）

| ID | 用例名 | 步骤 | 断言 |
|---|---|---|---|
| TMD-E2E-001 | 加载团队仪表盘 | 1. 进入 `team-dashboard.html`<br>2. 等待加载 | 显示 `team-dash-metric-team-count` 等三个指标卡片；下方显示团队卡片列表 |
| TMD-E2E-002 | 展开团队卡片 | 1. 点击某 `team-card-expand-btn` | 卡片展开，显示人员列表；每个人员显示产品 badge |
| TMD-E2E-003 | 未分配产品提示 | 1. 构造一个属于团队但无产品关联的人员<br>2. 展开该团队卡片 | 该人员行显示 `team-card-unassigned-warning`（红色文字"未分配产品"） |
| TMD-E2E-004 | 筛选团队 | 1. 在 `team-dash-filter-team-select` 选择团队 | 仅显示该团队的卡片（或该团队卡片被高亮） |
| TMD-E2E-005 | 人员关联产品正确 | 1. 构造人员 P 关联 L1 "支付宝"和 L2 "转账"<br>2. 展开 P 所在团队 | P 的行显示"支付宝 / 转账" badge |

### 4.11 测试用例：编辑锁定机制

| ID | 用例名 | 步骤 | 断言 |
|---|---|---|---|
| LOCK-E2E-001 | 自动获取锁 | 1. 用户 A 进入 People 页<br>2. 点击添加人员并保存 | 保存成功；锁指示器变为"编辑中 (你)" |
| LOCK-E2E-002 | 锁冲突阻止操作 | 1. 用户 A 获取锁<br>2. 用户 B 在同一浏览器（不同会话）或不同 IP 进入 People 页<br>3. 用户 B 尝试点击添加 | 按钮被禁用；若通过脚本强制触发 API，收到 423；Toast 显示"系统正在编辑中" |
| LOCK-E2E-003 | 锁自动续期 | 1. 用户 A 获取锁<br>2. 持续操作（多次编辑）<br>3. 观察 `/api/admin/status` | 每次操作后 `lastActivityAt` 更新；30 分钟内锁不被释放 |
| LOCK-E2E-004 | 锁过期后重新获取 | 1. 用户 A 获取锁<br>2. 等待 30 分钟无操作（测试环境可调整超时时间）<br>3. 用户 B 尝试编辑 | 用户 B 成功获取锁 |
| LOCK-E2E-005 | 行内错误展示 | 1. 用户 A 持有锁<br>2. 用户 B 在行内编辑某人员，点击保存（通过绕过 UI 禁用态的方式） | API 返回 423；页面该编辑行下方显示 `inline-error-text`"系统正在编辑中" |

### 4.12 测试用例：Admin 管理功能

| ID | 用例名 | 步骤 | 断言 |
|---|---|---|---|
| ADM-E2E-001 | 创建备份 | 1. 进入 Admin 页<br>2. 点击 `admin-backup-btn` | Toast 成功；备份列表表格新增一行；文件可下载 |
| ADM-E2E-002 | 下载备份 | 1. 点击某 `admin-backup-download-link` | 触发文件下载；HTTP 状态 200 |
| ADM-E2E-003 | 强制释放锁确认流 | 1. 点击 `admin-force-release-btn`<br>2. 页面出现确认条（确认/取消）<br>3. 点击取消 | 锁未被释放；确认条消失 |
| ADM-E2E-004 | 强制释放锁成功 | 1. 从另一会话获取锁<br>2. Admin 页点击强制释放并确认 | 锁状态变为"可编辑"；另一会话的锁指示器同步更新（下次轮询时） |

### 4.13 跨领域一致性测试

| ID | 用例名 | 步骤 | 断言 |
|---|---|---|---|
| CROSS-E2E-001 | 人员-产品-目标链路完整 | 1. 创建团队 → 人员 → L1 → L2 → L1Goal → L2Goal<br>2. 在 People 页验证人员关联了产品<br>3. 在 Products 页验证产品关联了人员和目标<br>4. 在 Goals 页验证目标关联了产品<br>5. 在 Dashboard 验证指标聚合正确 | 所有页面数据一致，无矛盾 |
| CROSS-E2E-002 | 删除团队后 Dashboard 更新 | 1. 记录 Dashboard 中某团队的产品数<br>2. 删除该团队<br>3. 刷新 Dashboard | 相关产品不再关联该团队（team 字段为 NULL）；Dashboard 仍显示这些产品但团队 badge 消失 |
| CROSS-E2E-003 | 删除标签后筛选器更新 | 1. 在 Tags 页删除标签 T<br>2. 进入 People 页的筛选下拉 | `people-filter-tag-select` 中不再包含 T |

### 4.14 可访问性 (a11y) 与响应式基础测试

| ID | 用例名 | 步骤 | 断言 |
|---|---|---|---|
| A11Y-E2E-001 | 键盘导航 | 1. 进入 People 页<br>2. 按 Tab 遍历所有可交互元素 | 每个按钮、输入框、链接都能通过 Tab 聚焦；聚焦状态可见（outline 或 border-color 变化） |
| A11Y-E2E-002 | 内联编辑键盘操作 | 1. Tab 到某行的编辑按钮，按 Enter<br>2. 在输入框中按 Esc | 进入编辑态；取消编辑态 |
| RESP-E2E-001 | 移动端导航折叠 | 1. 视口设为 375px 宽<br>2. 进入任意页面 | TopNav 变为汉堡菜单；内容不溢出水平方向 |
| RESP-E2E-002 | 表格横向滚动 | 1. 在 375px 下进入 People 页 | 表格容器可横向滚动，所有列可访问 |

---

## 附录 A：保守假设汇总

| 假设编号 | 假设内容 | 理由 |
|---|---|---|
| A-001 | 编辑锁定机制保持现有行为不变，前端仅调整 UI 表现方式 | `editLockMiddleware` 和 `admin.service.ts` 的锁逻辑已稳定运行，无需后端改动 |
| A-002 | 团队维度仪表盘的数据可通过现有 API 组合获取，或后端将新增 `/api/dashboard/team` | 因信息不足无法确定后端是否已有团队维度接口，前端设计兼容两种模式 |
| A-003 | 所有现有 API 返回的数据结构和状态码在本次重构中保持不变 | 重构范围仅限于前端，后端 API 契约稳定 |
| A-004 | 用户权限仅区分为"普通用户"和"管理员"，管理员可访问 Admin 页和强制释放锁 | 系统无复杂 RBAC，仅通过 Admin 路由豁免锁检查体现权限差异 |
| A-005 | 无弹窗约束仅针对业务操作弹窗，浏览器原生 confirm/alert 也禁止使用 | 设计要求明确"严禁任何弹窗"，统一使用内联确认条替代 |
| A-006 | DESIGN.md 中的字体（Copernicus/StyreneB）不可用时，使用文档中声明的开源替代（Cormorant Garamond / Inter） | 已在 CSS 变量中配置 fallback font stack |
| A-007 | 埋点数据暂不上报第三方，仅存储于前端内存队列，供后续批量导出 | 项目未指定埋点接收端，保持最小侵入性 |

---

*文档结束*
