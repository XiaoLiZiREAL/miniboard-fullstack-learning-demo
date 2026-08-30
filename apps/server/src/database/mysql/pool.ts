import mysql, { type Pool } from 'mysql2/promise'
import type { AppConfig } from '../../config/env.js'

export function createMysqlPool(config: AppConfig['mysql']): Pool {
  return mysql.createPool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0,
    charset: 'utf8mb4',
    timezone: 'Z',
    dateStrings: true,
  })
}

