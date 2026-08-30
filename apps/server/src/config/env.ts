import { z } from 'zod'

const DEVELOPMENT_JWT_SECRET = 'dev-only-secret-change-me-before-production-123456'

/**
 * process.env 中的所有值原本都是 string | undefined。
 * 在应用启动时集中校验，能让配置错误尽早暴露，而不是等到某个接口被调用才失败。
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DB_DRIVER: z.enum(['memory', 'mysql']).default('memory'),
  WEB_ORIGIN: z.string().default('http://localhost:5173'),
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET 至少需要 32 个字符')
    .default(DEVELOPMENT_JWT_SECRET),
  SEED_DEMO_DATA: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  MYSQL_HOST: z.string().default('127.0.0.1'),
  MYSQL_PORT: z.coerce.number().int().positive().default(3306),
  MYSQL_USER: z.string().default('root'),
  MYSQL_PASSWORD: z.string().default(''),
  MYSQL_DATABASE: z.string().default('miniboard'),
})

export type AppConfig = ReturnType<typeof loadConfig>

export function loadConfig(overrides: NodeJS.ProcessEnv = process.env) {
  const env = envSchema.parse(overrides)

  // 演示默认值只为了让本地学习开箱即用，绝不能悄悄进入生产环境。
  if (env.NODE_ENV === 'production' && env.JWT_SECRET === DEVELOPMENT_JWT_SECRET) {
    throw new Error('生产环境必须显式设置安全的 JWT_SECRET')
  }

  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    databaseDriver: env.DB_DRIVER,
    webOrigin: env.WEB_ORIGIN,
    jwtSecret: env.JWT_SECRET,
    seedDemoData: env.NODE_ENV === 'production' ? false : env.SEED_DEMO_DATA,
    mysql: {
      host: env.MYSQL_HOST,
      port: env.MYSQL_PORT,
      user: env.MYSQL_USER,
      password: env.MYSQL_PASSWORD,
      database: env.MYSQL_DATABASE,
    },
  }
}
