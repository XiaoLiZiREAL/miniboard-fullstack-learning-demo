# 全栈扩展练习

每道题都尽量同时修改数据库、后端、前端和测试。

## 入门：任务标签

给任务增加一个 `label` 字段。

验收条件：

- 创建、修改任务时可以选择标签。
- 看板卡片显示标签。
- 任务列表可以按标签筛选。
- Zod 限制标签最长 20 个字符。
- 内存和 MySQL 两种 Repository 都支持。

## 入门：任务统计接口

新增：

```text
GET /api/projects/:projectId/statistics
```

返回各状态任务数和完成率。尝试在 MySQL 中使用 `GROUP BY`。

## 中级：分页

让任务列表支持：

```text
?page=1&pageSize=20
```

响应改为：

```json
{
  "items": [],
  "page": 1,
  "pageSize": 20,
  "total": 35
}
```

思考 `LIMIT`、`OFFSET`，以及数据量很大时游标分页的区别。

## 中级：任务状态历史

创建 `task_status_history` 表，每次修改状态时记录：

- 原状态
- 新状态
- 操作者
- 修改时间

任务更新和历史写入应该放在同一个事务中。

## 中级：乐观锁

给 `tasks` 增加 `version`。更新时要求：

```sql
UPDATE tasks
SET title = ?, version = version + 1
WHERE id = ? AND version = ?;
```

影响行数为 0 时返回 `409 CONFLICT`，防止两个页面互相覆盖修改。

## 进阶：Refresh Token

在理解 Access Token 后再完成：

- Access Token 缩短为 15 分钟。
- Refresh Token 放入 HttpOnly Cookie。
- 数据库只保存 Refresh Token 的哈希或会话标识。
- 实现刷新、退出和撤销。
- 研究 CSRF、SameSite、Secure Cookie。

## 进阶：接口限流和审计日志

- 登录接口按照 IP 和邮箱限流。
- 为关键写操作记录 `requestId`、用户、资源和结果。
- 日志不能包含密码、Token 和数据库凭据。

