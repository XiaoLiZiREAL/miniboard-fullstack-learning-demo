import type { Request, Response } from 'express'
import { authenticatedUserId } from '../../http/authenticate.js'
import { ok } from '../../http/respond.js'
import { CommentService } from './comment.service.js'

export class CommentController {
  constructor(private readonly service: CommentService) {}

  list = async (req: Request, res: Response) =>
    ok(res, await this.service.list(authenticatedUserId(req), Number(req.params.taskId)))

  create = async (req: Request, res: Response) =>
    ok(
      res,
      await this.service.create(
        authenticatedUserId(req),
        Number(req.params.taskId),
        req.body.content,
      ),
      201,
    )

  delete = async (req: Request, res: Response) => {
    await this.service.delete(authenticatedUserId(req), Number(req.params.commentId))
    return ok(res, null)
  }
}

