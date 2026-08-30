import { watch } from 'node:fs'
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * 一个刻意保持小而透明的开发运行器。
 *
 * 为什么不同时运行 `tsc --watch` 和 `node --watch dist/server.js`？
 * TypeScript 一次编译可能更新多个 JS 文件，Node 会连续收到多次变化，旧 HTTP
 * 进程尚未释放端口时新进程就可能启动。这里由同一个父进程严格串行执行：
 * 停止旧 API -> 编译 -> 启动新 API，因此不会产生端口竞争。
 */

const require = createRequire(import.meta.url)
const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const serverRoot = resolve(scriptDirectory, '..')
const sourceDirectory = resolve(serverRoot, 'src')
const serverEntry = resolve(serverRoot, 'dist/server.js')
const typescriptCompiler = require.resolve('typescript/bin/tsc')

let apiProcess = null
let restartTimer = null
let rebuilding = false
let rebuildAgain = false
let shuttingDown = false
let sourceWatcher = null

function compile() {
  return new Promise((resolveCompile) => {
    console.log('\n[dev] TypeScript compiling...')
    const compiler = spawn(process.execPath, [typescriptCompiler, '-p', 'tsconfig.json'], {
      cwd: serverRoot,
      stdio: 'inherit',
    })
    compiler.once('exit', (code) => resolveCompile(code === 0))
    compiler.once('error', (error) => {
      console.error('[dev] Failed to start TypeScript compiler:', error)
      resolveCompile(false)
    })
  })
}

function stopApi() {
  const child = apiProcess
  apiProcess = null
  if (!child || child.exitCode !== null) return Promise.resolve()

  return new Promise((resolveStop) => {
    let settled = false
    let forceTimer
    const finish = () => {
      if (settled) return
      settled = true
      clearTimeout(forceTimer)
      resolveStop()
    }

    child.once('exit', finish)
    child.kill('SIGTERM')

    // 极端情况下避免坏连接或平台信号差异永久阻塞开发重启。
    forceTimer = setTimeout(() => {
      if (child.exitCode === null) child.kill('SIGKILL')
      finish()
    }, 3_500)
    forceTimer.unref()
  })
}

function startApi() {
  console.log('[dev] Starting API...')
  const child = spawn(process.execPath, [serverEntry], {
    cwd: serverRoot,
    stdio: 'inherit',
  })
  apiProcess = child

  child.once('error', (error) => console.error('[dev] Failed to start API:', error))
  child.once('exit', (code, signal) => {
    if (apiProcess === child) {
      apiProcess = null
      if (!shuttingDown && !rebuilding) {
        console.error(`[dev] API exited unexpectedly (${signal ?? code ?? 'unknown'}).`)
      }
    }
  })
}

async function rebuild() {
  if (rebuilding) {
    rebuildAgain = true
    return
  }

  rebuilding = true
  do {
    rebuildAgain = false
    await stopApi()
    const succeeded = await compile()

    // 编译期间若又保存了一次文件，直接进入下一轮，避免启动马上又关闭。
    if (succeeded && !rebuildAgain && !shuttingDown) startApi()
  } while (rebuildAgain && !shuttingDown)
  rebuilding = false
}

function scheduleRebuild(filename) {
  if (filename && !filename.endsWith('.ts')) return
  if (restartTimer) clearTimeout(restartTimer)
  restartTimer = setTimeout(() => void rebuild(), 250)
}

async function shutdown() {
  if (shuttingDown) return
  shuttingDown = true
  sourceWatcher?.close()
  if (restartTimer) clearTimeout(restartTimer)
  await stopApi()
  process.exit(0)
}

process.on('SIGINT', () => void shutdown())
process.on('SIGTERM', () => void shutdown())

// 先完成首次编译和启动，再开始监听，避免启动阶段的文件事件触发重复编译。
await rebuild()
sourceWatcher = watch(sourceDirectory, { recursive: true }, (_event, filename) => {
  scheduleRebuild(filename)
})
