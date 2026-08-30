import { Router, type RequestHandler } from 'express'
import { validate } from '../../http/validate.js'
import { TaskController } from './task.controller.js'
import {
  createTaskBody,
  projectTaskParams,
  taskIdParams,
  taskQuery,
  updateTaskBody,
} from './task.schema.js'

export function createTaskRouter(controller: TaskController, authenticate: RequestHandler) {
  const router = Router()
  router.use(authenticate)
  router.get(
    '/projects/:projectId/tasks',
    validate({ params: projectTaskParams, query: taskQuery }),
    controller.list,
  )
  router.post(
    '/projects/:projectId/tasks',
    validate({ params: projectTaskParams, body: createTaskBody }),
    controller.create,
  )
  router.get('/tasks/:taskId', validate({ params: taskIdParams }), controller.detail)
  router.patch(
    '/tasks/:taskId',
    validate({ params: taskIdParams, body: updateTaskBody }),
    controller.update,
  )
  router.delete('/tasks/:taskId', validate({ params: taskIdParams }), controller.delete)
  return router
}

