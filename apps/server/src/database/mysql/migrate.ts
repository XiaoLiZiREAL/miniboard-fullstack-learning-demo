import { readFile } from 'node:fs/promises'
import mysql from 'mysql2/promise'
import { loadConfig } from '../../config/env.js'
import { loadOptionalEnvFile } from '../../config/load-env.js'

loadOptionalEnvFile()
const config = loadConfig()

// 数据库名不能使用参数占位符，因此必须先用白名单约束，避免 SQL 注入。
if (!/^[A-Za-z0-9_]+$/.test(config.mysql.database)) {
  throw new Error('MYSQL_DATABASE 只能包含字母、数字和下划线')
}

const admin = await mysql.createConnection({
  host: config.mysql.host,
  port: config.mysql.port,
  user: config.mysql.user,
  password: config.mysql.password,
})

await admin.execute(
  `CREATE DATABASE IF NOT EXISTS \`${config.mysql.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`,
)
await admin.end()

// migration 是受信任的本地 SQL 文件，允许 multipleStatements；业务查询永远不要开启它。
const migrationConnection = await mysql.createConnection({
  ...config.mysql,
  multipleStatements: true,
})
// tsc 不复制 .sql 文件；这个相对路径在 src 和 dist 中都指向源码目录中的 schema.sql。
const schema = await readFile(new URL('../../../src/database/mysql/schema.sql', import.meta.url), 'utf8')
await migrationConnection.query(schema)
await migrationConnection.end()

console.log(`MySQL schema migrated successfully: ${config.mysql.database}`)
