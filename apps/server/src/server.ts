import { createServer } from 'node:http'
import { createApplication } from './app.js'
import { loadConfig } from './config/env.js'
import { loadOptionalEnvFile } from './config/load-env.js'

loadOptionalEnvFile()
const config = loadConfig()
const { app, close } = await createApplication(config)
// HTTP Server 独立创建，便于退出或热重载时先停止接收请求，再释放 Repository 连接。
const server = createServer(app)

server.listen(config.port, () => {
  console.log(`\nMiniBoard API: http://localhost:${config.port}`)
  console.log(`Database driver: ${config.databaseDriver}`)
  if (config.databaseDriver === 'memory' && config.seedDemoData) {
    console.log('Demo login: student@example.com / Fullstack123!\n')
  }
})

let shuttingDown = false

async function shutdown(signal: string) {
  if (shuttingDown) return
  shuttingDown = true
  console.log(`\n${signal} received, shutting down...`)

  let finished = false
  const finish = async (exitCode: number) => {
    if (finished) return
    finished = true
    clearTimeout(forceTimer)
    await close()
    process.exit(exitCode)
  }

  // server.close() 会等待正在处理的请求结束；设置上限可避免坏连接让重启永久卡住。
  const forceTimer = setTimeout(() => {
    console.error('Graceful shutdown timed out, closing remaining connections.')
    server.closeAllConnections()
    void finish(1)
  }, 3_000)
  forceTimer.unref()

  server.close((error) => void finish(error ? 1 : 0))
  server.closeIdleConnections()
}

process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))
