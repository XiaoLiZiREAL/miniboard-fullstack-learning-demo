# MiniBoard 学习指南

目标不是背诵每个库的 API，而是建立完整的后端心智模型。

## 第 0 课：先把项目跑起来

```bash
npm install
npm run dev
```

访问 `http://localhost:5173`，登录演示账号。打开浏览器开发者工具：

1. 进入 Network。
2. 点击项目卡片。
3. 找到 `GET /api/projects/1` 和 `GET /api/projects/1/tasks`。
4. 查看 Request Headers 中的 `Authorization`。
5. 查看 JSON Response。

此时先不要读后端代码，先确认前端和服务器通过什么数据交流。

## 第 1 课：理解 HTTP 和 REST

观察这些操作：

| 操作 | 方法 | 路径 | 状态码 |
|---|---|---|---|
| 登录 | POST | `/api/auth/login` | 200 |
| 创建项目 | POST | `/api/projects` | 201 |
| 获取项目 | GET | `/api/projects/:id` | 200 |
| 更新任务 | PATCH | `/api/tasks/:id` | 200 |
| 删除任务 | DELETE | `/api/tasks/:id` | 200 |

思考：为什么创建用 POST、局部更新用 PATCH？URL 为什么使用名词而不是 `createTask`？

## 第 2 课：跟踪创建任务请求

按照这个顺序打断点或添加临时日志：

1. `apps/web/src/components/TaskEditorModal.vue`
2. `apps/web/src/api/index.ts`
3. `apps/server/src/modules/tasks/task.routes.ts`
4. `apps/server/src/http/authenticate.ts`
5. `apps/server/src/http/validate.ts`
6. `apps/server/src/modules/tasks/task.controller.ts`
7. `apps/server/src/modules/tasks/task.service.ts`
8. `apps/server/src/repositories/memory/memory-repositories.ts`

你应该能回答：

- 哪一步把 JWT 变成 `userId`？
- 哪一步检查标题长度？
- 哪一步检查负责人是否属于项目？
- 哪一步真正生成任务 ID？

## 第 3 课：主动制造错误

学习错误处理最快的方法是故意破坏请求：

1. 删除 Authorization Header，应得到 `401 AUTH_REQUIRED`。
2. 把 Token 最后一个字符改掉，应得到 `401 INVALID_TOKEN`。
3. 发送空标题，应得到 `422 VALIDATION_ERROR`。
4. 用普通成员删除另一个人创建的任务，应得到 `403 FORBIDDEN`。
5. 请求不存在的任务，应得到 `404 NOT_FOUND`。
6. 发送畸形 JSON，应得到 `400 INVALID_JSON`。
7. 移除仍负责任务的成员，应得到 `409 MEMBER_HAS_ASSIGNED_TASKS`。

观察这些错误都如何经过 `error-handler.ts` 形成相同 JSON 结构。

## 第 4 课：读 Repository 接口

先读 `repositories/contracts.ts`，暂时不要读 MySQL SQL。

尝试只根据接口回答：Service 需要数据库提供哪些能力？然后对照内存和 MySQL 两种实现。

重点理解：

- 接口描述“需要什么”。
- MySQL Repository 描述“怎么用 SQL 做到”。
- Memory Repository 描述“怎么用数组做到”。
- Service 不应该知道具体实现。

## 第 5 课：接入 MySQL

完成 `docs/MYSQL_SETUP.md` 后，把一项任务从 `todo` 改成 `done`，然后重启服务器。

- 内存模式：修改消失。
- MySQL 模式：修改仍然存在。

接着在 MySQL 客户端执行：

```sql
SELECT p.name, u.name, pm.role
FROM project_members pm
JOIN projects p ON p.id = pm.project_id
JOIN users u ON u.id = pm.user_id;
```

把查询和 `MysqlProjectRepository.listMembers()` 对照阅读。

## 第 6 课：阅读测试

运行：

```bash
npm test
```

阅读 `apps/server/src/app.test.ts` 和 `config/env.test.ts`。测试覆盖：

```text
安全响应头 + 输入边界 + 认证 + 项目成员权限 + 任务数据不变量
+ 筛选统计 + 评论权限 + 生产配置保护
```

每条集成测试都会创建独立的内存 Repository，不依赖前一条测试生成的 token 或 ID。
你可以用 Vitest 的单测试运行功能验证任何一条都能独立通过。

尝试先修改 Service 制造一个权限漏洞，确认测试是否能发现；然后增加一条测试把漏洞固定下来。

## 第 6.5 课：理解开发运行器

阅读 `apps/server/scripts/dev.mjs`，观察它为什么按“停止 → 编译 → 启动”的顺序工作。

保存任意后端 `.ts` 文件，终端会出现：

```text
[dev] TypeScript compiling...
[dev] Starting API...
```

思考：如果新旧 HTTP 进程同时监听 3000 端口，会发生什么？为什么要对连续保存做防抖？

## 第 7 课：自己扩展

从 `docs/EXERCISES.md` 选择一个练习。严格按照下面顺序修改：

```text
需求 → 数据结构 → Repository 接口 → 两种 Repository 实现
→ Service 规则 → Schema → Controller → Route → 前端 → 测试
```

完成一个小功能的全链路，比继续阅读十个教程更能建立全栈能力。
