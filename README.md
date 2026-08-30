# MiniBoard 全栈学习 Demo

这是一个专门为“熟悉 Vue/React，正在学习 Node.js 后端”的开发者准备的完整项目。

你可以先在**没有 MySQL**的情况下运行全部页面和 API；等安装 MySQL 后，只需修改一个环境变量，业务代码无需改变。

## 技术栈

- 前端：Vue 3、TypeScript、Vite、Ant Design Vue、Vue Router、Pinia
- 后端：Node.js、TypeScript、Express 5、Zod、jose、scrypt、Pino、Helmet
- 数据：内存 Repository（默认）或 MySQL + mysql2
- 测试：Vitest、Supertest
- 工程：npm workspaces、Vite 路由拆包、Ant Design 按需导入、自带后端开发运行器

## 立即运行（无需 MySQL）

需要 Node.js 22 或更高版本。

```bash
npm install
npm run dev
```

打开 <http://localhost:5173>，使用演示账号：

```text
student@example.com
Fullstack123!
```

运行测试和生产构建：

```bash
npm test
npm run typecheck
npm run build
```

## 常用命令

```bash
npm run dev             # 同时运行前端和后端
npm run dev:server      # 只运行 Express，端口 3000
npm run dev:web         # 只运行 Vue，端口 5173
npm test                # 后端集成测试，始终使用内存数据库
npm run typecheck       # 检查前后端 TypeScript
npm run build           # 构建前后端
npm run db:migrate      # 安装 MySQL 后创建数据库和表
npm run db:seed         # 向 MySQL 写入演示数据
```

## 项目结构

```text
DEMO/
├─ apps/
│  ├─ web/                         Vue 前端
│  │  ├─ vite.config.ts            按需组件导入、开发代理
│  │  └─ src/
│  │     ├─ api/                   HTTP 客户端
│  │     ├─ components/            任务编辑和详情组件
│  │     ├─ layouts/               应用整体布局
│  │     ├─ router/                页面路由和登录守卫
│  │     ├─ stores/                Pinia 登录状态
│  │     └─ views/                 登录、项目、看板、学习页面
│  └─ server/                      Express 后端
│     ├─ scripts/dev.mjs           串行编译与安全热重载
│     └─ src/
│        ├─ config/                环境变量
│        ├─ database/mysql/        schema、迁移、种子
│        ├─ domain/                领域实体类型
│        ├─ errors/                业务错误
│        ├─ http/                  校验、认证、错误中间件
│        ├─ modules/               Controller、Service、Route
│        ├─ repositories/          内存和 MySQL 数据访问
│        └─ security/              密码哈希、JWT
└─ docs/                           配套教材与练习
```

## 从哪里开始阅读

不要从第一行开始把全部代码顺序读完。建议：

1. 运行项目并登录。
2. 在浏览器 Network 面板找到 `GET /api/projects`。
3. 阅读 `apps/web/src/api/client.ts`。
4. 跟踪后端的 `project.routes.ts → project.controller.ts → project.service.ts`。
5. 最后阅读 `memory-repositories.ts` 和 `mysql-repositories.ts`。

详细步骤见 [学习指南](docs/LEARNING_GUIDE.md)。

## API 响应协议

成功：

```json
{
  "success": true,
  "data": {}
}
```

失败：

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数不符合要求",
    "details": {}
  }
}
```

你也可以使用 [requests.http](apps/server/requests.http) 在支持 HTTP Client 的编辑器中直接调用 API。

## MySQL

当前默认值是：

```env
DB_DRIVER=memory
```

因此数据在后端进程重启后会重置。安装 MySQL 后的完整操作见 [MySQL 接入指南](docs/MYSQL_SETUP.md)。

## 教学项目与生产项目的差异

- Demo 把 Access Token 放在 `sessionStorage`，方便观察请求；生产系统应评估 HttpOnly Cookie、Refresh Token、CSRF 等方案。
- Demo 没有实现限流、邮件验证、密码找回和 Token 撤销。
- 已使用 Helmet、安全日志脱敏和 100 KB JSON 上限，但真实公网服务还应配置反向代理、HTTPS、限流和监控。
- 生产模式必须显式提供 JWT 密钥，并自动关闭演示数据；不要把示例密钥用于部署。
- MySQL migration 采用一个幂等 schema 文件；多人生产项目通常使用带版本号的迁移工具。
- 内存 Repository 用于学习和测试，不是持久化方案。
