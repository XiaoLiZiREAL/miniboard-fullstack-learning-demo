/**
 * Node.js 24 原生支持 .env，因此项目不额外依赖 dotenv。
 * 文件不存在是正常情况：所有本地开发配置都有安全的演示默认值。
 */
export function loadOptionalEnvFile() {
  try {
    process.loadEnvFile()
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code !== 'ENOENT') throw error
  }
}

