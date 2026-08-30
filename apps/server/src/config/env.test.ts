import { describe, expect, it } from 'vitest'
import { loadConfig } from './env.js'

describe('environment configuration', () => {
  it('生产环境拒绝开发用 JWT 密钥', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow(
      '生产环境必须显式设置安全的 JWT_SECRET',
    )
  })

  it('生产环境即使收到配置也不会植入演示数据', () => {
    const config = loadConfig({
      NODE_ENV: 'production',
      JWT_SECRET: 'production-secret-must-have-at-least-thirty-two-characters',
      SEED_DEMO_DATA: 'true',
    })
    expect(config.seedDemoData).toBe(false)
  })
})
