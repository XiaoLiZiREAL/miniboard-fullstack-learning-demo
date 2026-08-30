# 架构说明

## 1. 请求链路

以“创建任务”为例：

```text
ProjectBoardView.vue
  ↓ taskApi.create()
api/client.ts
  ↓ POST /api/projects/:projectId/tasks
task.routes.ts
  ↓ authenticate + validate
task.controller.ts
  ↓ 提取 userId/projectId/body
task.service.ts
  ↓ 检查成员权限和负责人
TaskRepository 接口
  ↓ 根据 DB_DRIVER 选择实现
memory-repositories.ts 或 mysql-repositories.ts
```

每一层只解决一类问题。如果 Controller 里同时出现 JWT、权限判断和 SQL，代码一开始看似短，后续测试和修改会非常困难。

## 2. Route

Route 决定：

- HTTP 方法和 URL
- 需要哪些 Middleware
- 最终调用哪个 Controller

Route 不写业务规则。

## 3. Middleware

中间件解决多个接口都会遇到的横切问题：

- `authenticate.ts`：验证 Bearer Token
- `validate.ts`：运行 Zod Schema
- `error-handler.ts`：统一错误响应
- `pino-http`：请求日志
- `helmet`：常用 HTTP 安全响应头

中间件存在执行顺序。`errorHandler` 必须放在全部路由之后。
日志会把 Authorization、Cookie 和 Set-Cookie 脱敏；畸形 JSON 返回 400，超过 100 KB 的请求体返回 413，而不是误报 500。

## 4. Controller

Controller 是 HTTP 世界的适配层，负责：

- 读取 `req.params`、`req.body`
- 读取认证中间件写入的 `req.userId`
- 调用 Service
- 决定 `200`、`201` 等状态码

它不知道 SQL 长什么样。

## 5. Service 与 Policy

Service 表达业务规则，例如：

- 任务负责人必须属于项目
- 只有项目所有者可以添加成员
- 所有者不能把自己移出项目
- 仍负责任务的成员不能被移出，必须先解除或重新分配任务
- 只有所有者或创建者能删除任务

项目权限检查集中在 `ProjectService.requireRole()`。它相当于你之前提到的 `checks`，也可以单独命名为 `policy` 或 `guard`。

## 6. Repository

Repository 封装数据访问。Service 依赖接口：

```ts
interface TaskRepository {
  findById(id: number): Promise<Task | null>
  create(input: CreateTaskInput): Promise<Task>
}
```

Service 不关心接口后面是 MySQL、内存数组还是测试替身。`container.ts` 负责选择具体实现，这叫依赖注入。

## 7. 为什么既有内存实现又有 MySQL 实现

它不仅解决“当前没安装 MySQL”的问题，还展示了一个重要架构能力：

```text
业务规则不应该和基础设施绑定。
```

切换 `DB_DRIVER` 时，Controller 与 Service 一行都不用修改。

## 8. 认证与授权

认证回答“你是谁”：

```text
Authorization Header → JWT 签名验证 → userId
```

授权回答“你能做什么”：

```text
userId + projectId → 查询 project_members → owner/member/无权限
```

前端隐藏按钮只能改善交互，不能提供安全性。最终权限判断必须在服务器端执行。

## 9. 错误处理

预期业务错误抛出 `AppError`：

```ts
throw new AppError(403, 'FORBIDDEN', '只有项目所有者能执行此操作')
```

Controller 不需要到处写 `try/catch`。Express 5 会把异步错误交给末尾的错误中间件。

## 10. 数据库事务

创建项目需要写入 `projects` 和 `project_members`。MySQL Repository 使用事务：

```text
BEGIN
INSERT projects
INSERT project_members
COMMIT
```

失败时执行 `ROLLBACK`，并在 `finally` 中归还连接。

## 11. 前端拆包和组件按需导入

路由组件在 `router/index.ts` 中使用动态 `import()`，Ant Design Vue 组件由
`unplugin-vue-components` 在编译模板时按需引入。这样登录页不会先下载完整看板和日期选择器。

`src/components.d.ts` 是插件生成的组件类型声明。它让 `vue-tsc` 能校验模板事件和属性，
例如 DatePicker 的值类型、Menu 点击事件和 Select 的回调边界。

## 12. 开发环境热重载

`apps/server/scripts/dev.mjs` 直接持有 TypeScript 编译器和 API 子进程：

```text
检测 src 变化 → 防抖 → 停止旧 API → tsc 编译 → 启动新 API
```

这个顺序能避免一次编译更新多个 JS 文件时连续重启，从而减少 `EADDRINUSE` 端口竞争。
生产启动仍然使用 `npm run build` 后的 `node dist/server.js`。
