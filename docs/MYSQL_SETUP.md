# MySQL 接入指南

现在不安装 MySQL 完全没问题。等准备好后再执行本指南。

## 1. 创建本地配置

在 `apps/server` 中复制环境变量示例：

PowerShell：

```powershell
Copy-Item .env.example .env
```

然后修改 `.env`：

```env
DB_DRIVER=mysql
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=你的密码
MYSQL_DATABASE=miniboard
JWT_SECRET=换成至少32位的随机字符串
```

`.env` 已加入 `.gitignore`，不要提交真实密码。

## 2. 创建数据库和表

在项目根目录运行：

```bash
npm run db:migrate
```

脚本会：

1. 连接 MySQL Server。
2. 创建 `miniboard` 数据库。
3. 执行 `apps/server/src/database/mysql/schema.sql`。
4. 创建五张表、外键和索引。

SQL 文件使用 `CREATE TABLE IF NOT EXISTS`，可以重复执行。

## 3. 导入演示数据

```bash
npm run db:seed
```

会创建：

```text
student@example.com
Fullstack123!
```

种子脚本会检查数据是否已经存在，重复执行不会重复创建同名演示项目。

## 4. 启动

```bash
npm run dev
```

后端终端应该显示：

```text
Database driver: mysql
```

## 5. 手工导入 SQL 的替代方式

如果你不想使用 Node migration 脚本，可以先手动创建 `miniboard` 数据库，再在 MySQL 客户端执行：

```sql
SOURCE D:/CODE/CODES/DEMO/apps/server/src/database/mysql/schema.sql;
```

路径按你的实际位置修改，并使用正斜杠。

## 6. 常见错误

### ECONNREFUSED

MySQL 服务没有启动，或端口不是 3306。

### ER_ACCESS_DENIED_ERROR

用户名或密码错误，检查 `.env`。

### Unknown database

先执行 `npm run db:migrate`。

### Public Key Retrieval is not allowed

通常与 MySQL 客户端认证方式有关。优先确认使用的是当前版 `mysql2` 和正确账号，不要随意关闭安全校验。

## 7. 推荐观察的 SQL

```sql
USE miniboard;

SHOW TABLES;

SELECT * FROM users;

SELECT p.name AS project_name, u.name AS member_name, pm.role
FROM project_members pm
JOIN projects p ON p.id = pm.project_id
JOIN users u ON u.id = pm.user_id;

EXPLAIN SELECT * FROM tasks WHERE project_id = 1 AND status = 'todo';
```

