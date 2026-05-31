# API 接口规范

> 版本：v1.0
> 基础路径：`/api`
> Content-Type：`application/json`

---

## 一、通用约定

### 1.1 响应格式

```typescript
// 成功响应
type SuccessResponse<T> = {
  success: true;
  data: T;
};

// 错误响应
type ErrorResponse = {
  success: false;
  error: {
    code: string;        // 错误码，如 VALIDATION_ERROR
    message: string;     // 人类可读的错误描述
    details?: unknown;   // 详细错误信息（如校验失败字段列表）
  };
};
```

### 1.2 HTTP 状态码

| 状态码 | 使用场景 |
|---|---|
| 200 | GET/PUT/DELETE 成功 |
| 201 | POST 创建成功 |
| 400 | 请求参数错误（校验失败） |
| 404 | 资源不存在 |
| 409 | 业务冲突（如唯一键冲突） |
| 500 | 服务器内部错误 |

### 1.3 通用错误码

| 错误码 | 说明 | HTTP 状态 |
|---|---|---|
| `VALIDATION_ERROR` | 请求参数校验失败 | 400 |
| `RESOURCE_NOT_FOUND` | 请求的资源不存在 | 404 |
| `UNIQUE_VIOLATION` | 唯一约束冲突 | 409 |
| `FOREIGN_KEY_VIOLATION` | 外键约束冲突 | 409 |
| `INTERNAL_ERROR` | 服务器内部错误 | 500 |

---

## 二、健康检查

### GET /api/health

**响应**：

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2026-05-20T10:30:00.000Z",
    "version": "2.0.0"
  }
}
```

---

## 三、标签管理

Tag 为独立实体，通过 `team_tags` / `person_tags` 关联表与 Team / Person 多对多关联。

### GET /api/tags

**响应**：`SuccessResponse<Tag[]>`

```json
{
  "success": true,
  "data": [
    { "id": "tag-1", "value": "外汇平台", "createdAt": "...", "updatedAt": "..." },
    { "id": "tag-2", "value": "部门主管", "createdAt": "...", "updatedAt": "..." }
  ]
}
```

### POST /api/tags

**请求体**：

```json
{
  "value": "外汇平台"   // required, string, max 50, unique
}
```

**响应**：`SuccessResponse<Tag>` (201)

### DELETE /api/tags/:id

**响应**：`SuccessResponse<{ deleted: true }>`

> 级联行为：从 `team_tags`、`person_tags` 级联删除关联记录

---

## 四、团队管理

### GET /api/teams

**查询参数**：无

**响应**：`SuccessResponse<Team[]>`

```json
{
  "success": true,
  "data": [
    {
      "id": "team-fx",
      "name": "外汇",
      "tagIds": ["tag-1", "tag-2"],
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

### GET /api/teams/:id

**响应**：`SuccessResponse<Team>`

### POST /api/teams

**请求体**：

```json
{
  "name": "外汇",              // required, string, max 100
  "tagIds": ["tag-1"]          // optional, string[]
}
```

**响应**：`SuccessResponse<Team>` (201)

### PUT /api/teams/:id

**请求体**：同 POST，全部字段可选

**响应**：`SuccessResponse<Team>`

### DELETE /api/teams/:id

**响应**：`SuccessResponse<{ deleted: true }>`

> 级联行为：关联 Person.teamId → NULL；关联 L1Product.teamId → NULL

---

## 五、人员管理

### GET /api/people

**查询参数**：

| 参数 | 类型 | 说明 |
|---|---|---|
| `name` | string | 姓名模糊搜索 |
| `teamId` | string | 按团队筛选 |
| `location` | string | 按所在地筛选 |

**响应**：`SuccessResponse<Person[]>`

```json
{
  "success": true,
  "data": [
    {
      "id": "p-dsk",
      "name": "戴顺(顺凯)",
      "employeeId": "242537",
      "level": "18",
      "tagIds": ["tag-2"],
      "teamId": null,
      "location": "上海",
      "managerId": null,
      "l1ProductIds": [],
      "l2ProductIds": [],
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

### GET /api/people/:id

**响应**：`SuccessResponse<Person>`

### POST /api/people

**请求体**：

```json
{
  "name": "戴顺(顺凯)",          // required, string, max 100
  "employeeId": "242537",       // optional, string, max 20
  "level": "18",                // optional, string, max 10
  "tagIds": ["tag-2"],          // optional, string[]
  "teamId": null,               // optional, string | null
  "location": "上海",            // optional, string, max 50
  "managerId": null,            // optional, string | null
  "l1ProductIds": [],           // optional, string[]
  "l2ProductIds": []            // optional, string[]
}
```

**校验规则**：
- `managerId` 不能等于自身 `id`（禁止自引用）
- `managerId` 如存在，必须在数据库中存在

**响应**：`SuccessResponse<Person>` (201)

### PUT /api/people/:id

**请求体**：同 POST，全部字段可选

**响应**：`SuccessResponse<Person>`

### DELETE /api/people/:id

**响应**：`SuccessResponse<{ deleted: true }>`

> 级联行为：从所有 Owner 关联表删除；下属 managerId → NULL；清理 person_l1_products / person_l2_products

---

## 六、产品管理

### GET /api/products/l1

**响应**：`SuccessResponse<L1Product[]>`

```json
{
  "success": true,
  "data": [
    {
      "id": "l1-ff401",
      "name": "集中清算产品",
      "code": "FF4010000",
      "teamId": "team-my",
      "ownerIds": ["p-qyd"],
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

### GET /api/products/l1/:id

**响应**：`SuccessResponse<L1Product & { l2Products: L2Product[] }>`

> 返回 L1 详情时，附带其下所有 L2 产品列表

### POST /api/products/l1

**请求体**：

```json
{
  "name": "集中清算产品",        // required, string, max 100
  "code": "FF4010000",           // required, string, max 20, unique
  "teamId": "team-my",           // optional, string | null
  "ownerIds": ["p-qyd"]          // optional, string[]
}
```

**响应**：`SuccessResponse<L1Product>` (201)

### PUT /api/products/l1/:id

**请求体**：同 POST，全部字段可选

**响应**：`SuccessResponse<L1Product>`

### DELETE /api/products/l1/:id

**响应**：`SuccessResponse<{ deleted: true }>`

> 级联行为：删除其下所有 L2 产品；清理 l1_product_owners, person_l1_products, l1_goals

---

### GET /api/products/l2

**查询参数**：

| 参数 | 类型 | 说明 |
|---|---|---|
| `l1Id` | string | 按所属 L1 筛选 |

**响应**：`SuccessResponse<L2Product[]>`

```json
{
  "success": true,
  "data": [
    {
      "id": "l2-ff40101",
      "l1Id": "l1-ff401",
      "name": "跨币种跨境集中清算产品",
      "code": "FF4010100",
      "ownerIds": [],
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

### GET /api/products/l2/:id

**响应**：`SuccessResponse<L2Product>`

### POST /api/products/l2

**请求体**：

```json
{
  "l1Id": "l1-ff401",            // required, string
  "name": "跨币种跨境集中清算产品", // required, string, max 100
  "code": "FF4010100",            // required, string, max 20
  "ownerIds": []                  // optional, string[]
}
```

**响应**：`SuccessResponse<L2Product>` (201)

> 后端通过 L1Product 聚合根事务执行创建

### PUT /api/products/l2/:id

**请求体**：同 POST，`l1Id` 可选（支持移动 L2 到另一个 L1）

**响应**：`SuccessResponse<L2Product>`

### DELETE /api/products/l2/:id

**响应**：`SuccessResponse<{ deleted: true }>`

> 级联行为：清理 l2_product_owners, person_l2_products, l2_goals

---

## 七、目标管理

### GET /api/goals/l0

**响应**：`SuccessResponse<L0Goal[]>`

```json
{
  "success": true,
  "data": [
    {
      "id": "g0-001",
      "content": "提升部门整体交付效率",
      "standard": "Q3 交付准时率 ≥ 90%",
      "l1GoalIds": ["g1-001", "g1-002"],
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

### GET /api/goals/l0/:id

**响应**：`SuccessResponse<L0Goal & { l1Goals: L1Goal[] }>`

### POST /api/goals/l0

**请求体**：

```json
{
  "content": "提升部门整体交付效率",   // required, string, max 2000
  "standard": "Q3 交付准时率 ≥ 90%",   // optional, string, max 2000
  "l1GoalIds": ["g1-001", "g1-002"]    // optional, string[]
}
```

**响应**：`SuccessResponse<L0Goal>` (201)

### PUT /api/goals/l0/:id

**请求体**：同 POST，全部字段可选

**响应**：`SuccessResponse<L0Goal>`

### DELETE /api/goals/l0/:id

**响应**：`SuccessResponse<{ deleted: true }>`

> 级联行为：清理 l0_goal_l1_goals

---

### GET /api/goals/l1

**查询参数**：

| 参数 | 类型 | 说明 |
|---|---|---|
| `l1ProductId` | string | 按所属 L1 产品筛选 |

**响应**：`SuccessResponse<L1Goal[]>`

```json
{
  "success": true,
  "data": [
    {
      "id": "g1-001",
      "l1ProductId": "l1-ff401",
      "content": "完成集中清算核心链路重构",
      "standard": "接口响应时间 < 100ms",
      "l0GoalIds": ["g0-001"],
      "l2GoalIds": ["g2-001", "g2-002"],
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

### GET /api/goals/l1/:id

**响应**：`SuccessResponse<L1Goal & { l2Goals: L2Goal[] }>`

### POST /api/goals/l1

**请求体**：

```json
{
  "l1ProductId": "l1-ff401",          // required, string
  "content": "完成集中清算核心链路重构",  // required, string, max 2000
  "standard": "接口响应时间 < 100ms",   // optional, string, max 2000
  "l0GoalIds": ["g0-001"],             // optional, string[]
  "l2GoalIds": ["g2-001", "g2-002"]    // optional, string[]
}
```

**响应**：`SuccessResponse<L1Goal>` (201)

### PUT /api/goals/l1/:id

**请求体**：同 POST，全部字段可选

**响应**：`SuccessResponse<L1Goal>`

### DELETE /api/goals/l1/:id

**响应**：`SuccessResponse<{ deleted: true }>`

> 级联行为：清理 l0_goal_l1_goals, l1_goal_l2_goals

---

### GET /api/goals/l2

**查询参数**：

| 参数 | 类型 | 说明 |
|---|---|---|
| `l2ProductId` | string | 按所属 L2 产品筛选 |

**响应**：`SuccessResponse<L2Goal[]>`

```json
{
  "success": true,
  "data": [
    {
      "id": "g2-001",
      "l2ProductId": "l2-ff40101",
      "content": "完成跨境清算接口性能优化",
      "standard": "P99 < 50ms",
      "l1GoalIds": ["g1-001"],
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

### GET /api/goals/l2/:id

**响应**：`SuccessResponse<L2Goal>`

### POST /api/goals/l2

**请求体**：

```json
{
  "l2ProductId": "l2-ff40101",        // required, string
  "content": "完成跨境清算接口性能优化",   // required, string, max 2000
  "standard": "P99 < 50ms",            // optional, string, max 2000
  "l1GoalIds": ["g1-001"]              // optional, string[]
}
```

**响应**：`SuccessResponse<L2Goal>` (201)

### PUT /api/goals/l2/:id

**请求体**：同 POST，全部字段可选

**响应**：`SuccessResponse<L2Goal>`

### DELETE /api/goals/l2/:id

**响应**：`SuccessResponse<{ deleted: true }>`

> 级联行为：清理 l1_goal_l2_goals

---

## 八、目标关联管理

### GET /api/goals/l0/:id/l1-goals

**响应**：`SuccessResponse<L1Goal[]>`

> 返回该 L0 Goal 关联的所有 L1 Goals

### POST /api/goals/l0/:id/l1-goals

**请求体**：

```json
{
  "l1GoalIds": ["g1-003", "g1-004"]    // required, string[]
}
```

**响应**：`SuccessResponse<{ linked: number }>`

### DELETE /api/goals/l0/:id/l1-goals/:l1GoalId

**响应**：`SuccessResponse<{ unlinked: true }>`

---

### GET /api/goals/l1/:id/l2-goals

**响应**：`SuccessResponse<L2Goal[]>`

### POST /api/goals/l1/:id/l2-goals

**请求体**：

```json
{
  "l2GoalIds": ["g2-003", "g2-004"]    // required, string[]
}
```

**响应**：`SuccessResponse<{ linked: number }>`

### DELETE /api/goals/l1/:id/l2-goals/:l2GoalId

**响应**：`SuccessResponse<{ unlinked: true }>`

---

## 九、透视看板

### GET /api/dashboard

**查询参数**：

| 参数 | 类型 | 说明 |
|---|---|---|
| `teamId` | string | 按团队筛选 L1 产品 |
| `location` | string | 按人员所在地筛选 |

**响应**：`SuccessResponse<DashboardTree[]>`

```json
{
  "success": true,
  "data": [
    {
      "l1Product": {
        "id": "l1-ff401",
        "name": "集中清算产品",
        "code": "FF4010000",
        "team": { "id": "team-my", "name": "马来团队" }
      },
      "metrics": {
        "l2Count": 3,
        "peopleCount": 5,
        "l1GoalCount": 1,
        "l2GoalCount": 2,
        "coveragePercent": 67
      },
      "l1Goals": [
        {
          "id": "g1-001",
          "content": "完成集中清算核心链路重构",
          "standard": "接口响应时间 < 100ms"
        }
      ],
      "l2Nodes": [
        {
          "l2Product": {
            "id": "l2-ff40101",
            "name": "跨币种跨境集中清算产品",
            "code": "FF4010100"
          },
          "people": [
            { "id": "p-qyd", "name": "秦彦迪(博望)", "level": "16" }
          ],
          "l2Goals": [
            { "id": "g2-001", "content": "完成跨境清算接口性能优化" }
          ]
        }
      ],
      "unassignedPeople": []
    }
  ]
}
```

---

## 十、数据导入导出

### POST /api/export

**请求体**：无

**响应**：`application/json` 文件下载（兼容原原型 data.json 格式）

### POST /api/import

**请求体**：`multipart/form-data`

| 字段 | 类型 | 说明 |
|---|---|---|
| `file` | File | JSON 文件（兼容原原型格式） |

**响应**：`SuccessResponse<{ imported: { teams: number, people: number, l1Products: number, l2Products: number, l0Goals: number, l1Goals: number, l2Goals: number } }>`

> 导入时覆盖现有数据（全量替换），建议先执行备份。

---

## 十一、DTO Zod Schema 汇总

### Tag DTO

```typescript
const TagSchema = z.object({
  id: z.string().optional(),
  value: z.string().min(1).max(50),
});
```

### Team DTO

```typescript
const TeamSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(100),
  tagIds: z.array(z.string()).default([]),
});
```

### Person DTO

```typescript
const PersonSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(100),
  employeeId: z.string().max(20).nullable().default(null),
  level: z.string().max(10).nullable().default(null),
  tagIds: z.array(z.string()).default([]),
  teamId: z.string().nullable().default(null),
  location: z.string().max(50).nullable().default(null),
  managerId: z.string().nullable().default(null),
  l1ProductIds: z.array(z.string()).default([]),
  l2ProductIds: z.array(z.string()).default([]),
}).refine((data) => !data.managerId || data.managerId !== data.id, {
  message: "managerId cannot be the same as id",
});
```

### L1 Product DTO

```typescript
const L1ProductSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(20),
  teamId: z.string().nullable().default(null),
  ownerIds: z.array(z.string()).default([]),
});
```

### L2 Product DTO

```typescript
const L2ProductSchema = z.object({
  id: z.string().optional(),
  l1Id: z.string().min(1),
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(20),
  ownerIds: z.array(z.string()).default([]),
});
```

### L0 Goal DTO

```typescript
const L0GoalSchema = z.object({
  id: z.string().optional(),
  content: z.string().min(1).max(2000),
  standard: z.string().max(2000).nullable().default(null),
  l1GoalIds: z.array(z.string()).default([]),
});
```

### L1 Goal DTO

```typescript
const L1GoalSchema = z.object({
  id: z.string().optional(),
  l1ProductId: z.string().min(1),
  content: z.string().min(1).max(2000),
  standard: z.string().max(2000).nullable().default(null),
  l0GoalIds: z.array(z.string()).default([]),
  l2GoalIds: z.array(z.string()).default([]),
});
```

### L2 Goal DTO

```typescript
const L2GoalSchema = z.object({
  id: z.string().optional(),
  l2ProductId: z.string().min(1),
  content: z.string().min(1).max(2000),
  standard: z.string().max(2000).nullable().default(null),
  l1GoalIds: z.array(z.string()).default([]),
});
```

### Dashboard Query DTO

```typescript
const DashboardQuerySchema = z.object({
  teamId: z.string().optional(),
  location: z.string().optional(),
});
```
