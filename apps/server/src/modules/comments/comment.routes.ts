import { Router, type RequestHandler } from 'express'
import { validate } from '../../http/validate.js'
import { CommentController } from './comment.controller.js'
import { commentIdParams, createCommentBody, taskCommentParams } from './comment.schema.js'

export function createCommentRouter(controller: CommentController, authenticate: RequestHandler) {
  const router = Router()
  router.use(authenticate)
  router.get('/tasks/:taskId/comments', validate({ params: taskCommentParams }), controller.list)
  router.post(
    '/tasks/:taskId/comments',
    validate({ params: taskCommentParams, body: createCommentBody }),
    controller.create,
  )
  router.delete('/comments/:commentId', validate({ params: commentIdParams }), controller.delete)
  return router
}

