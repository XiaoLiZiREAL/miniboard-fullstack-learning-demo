import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import pino from 'pino'
import { pinoHttp } from 'pino-http'
import type { AppConfig } from './config/env.js'
import { createContainer } from './container.js'
import { createAuthenticate } from './http/authenticate.js'
import { errorHandler, notFoundHandler } from './http/error-handler.js'
import { ok } from './http/respond.js'
import { AuthController } from './modules/auth/auth.controller.js'
import { createAuthRouter } from './modules/auth/auth.routes.js'
import { CommentController } from './modules/comments/comment.controller.js'
import { createCommentRouter } from './modules/comments/comment.routes.js'
import { ProjectController } from './modules/projects/project.controller.js'
import { createProjectRouter } from './modules/projects/project.routes.js'
import { TaskController } from './modules/tasks/task.controller.js'
import { createTaskRouter } from './modules/tasks/task.routes.js'

export async function createApplication(config: AppConfig) {
  const container = await createContainer(config)
  const app = express()

  app.disable('x-powered-by')

  // 中间件顺序很重要：日志和 body 解析要在路由之前，错误处理必须在路由之后。
  app.use(
    pinoHttp({
      logger: pino({
        level: config.nodeEnv === 'test' ? 'silent' : 'info',
        // Token、Cookie 等凭据绝不能进入日志文件。
        redact: {
          paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
          censor: '[REDACTED]',
        },
      }),
    }),
  )
  app.use(helmet())
  app.use(cors({ origin: config.webOrigin }))
  app.use(express.json({ limit: '100kb' }))

  app.get('/api/health', (_req, res) =>
    ok(res, {
      status: 'ok',
      databaseDriver: config.databaseDriver,
      timestamp: new Date().toISOString(),
    }),
  )

  const authenticate = createAuthenticate(container.tokens)
  app.use('/api/auth', createAuthRouter(new AuthController(container.authService), authenticate))
  app.use(
    '/api/projects',
    createProjectRouter(new ProjectController(container.projectService), authenticate),
  )
  app.use('/api', createTaskRouter(new TaskController(container.taskService), authenticate))
  app.use('/api', createCommentRouter(new CommentController(container.commentService), authenticate))

  app.use(notFoundHandler)
  app.use(errorHandler)

  return {
    app,
    close: () => container.repositories.close(),
  }
}
