import type { Request, Response } from 'express'
import { authenticatedUserId } from '../../http/authenticate.js'
import { ok } from '../../http/respond.js'
import type { TaskFilters } from '../../repositories/contracts.js'
import { TaskService } from './task.service.js'

export class TaskController {
  constructor(private readonly service: TaskService) {}

  list = async (req: Request, res: Response) =>
    ok(
      res,
      await this.service.list(
        authenticatedUserId(req),
        Number(req.params.projectId),
        (res.locals.validatedQuery ?? {}) as TaskFilters,
      ),
    )

  detail = async (req: Request, res: Response) =>
    ok(res, await this.service.detail(authenticatedUserId(req), Number(req.params.taskId)))

  create = async (req: Request, res: Response) =>
    ok(
      res,
      await this.service.create(authenticatedUserId(req), Number(req.params.projectId), req.body),
      201,
    )

  update = async (req: Request, res: Response) =>
    ok(
      res,
      await this.service.update(authenticatedUserId(req), Number(req.params.taskId), req.body),
    )

  delete = async (req: Request, res: Response) => {
    await this.service.delete(authenticatedUserId(req), Number(req.params.taskId))
    return ok(res, null)
  }
}

