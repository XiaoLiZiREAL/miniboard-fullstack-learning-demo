import type { Request, Response } from 'express'
import { authenticatedUserId } from '../../http/authenticate.js'
import { ok } from '../../http/respond.js'
import { ProjectService } from './project.service.js'

export class ProjectController {
  constructor(private readonly service: ProjectService) {}

  list = async (req: Request, res: Response) =>
    ok(res, await this.service.list(authenticatedUserId(req)))

  detail = async (req: Request, res: Response) =>
    ok(res, await this.service.detail(authenticatedUserId(req), Number(req.params.projectId)))

  create = async (req: Request, res: Response) =>
    ok(res, await this.service.create(authenticatedUserId(req), req.body), 201)

  update = async (req: Request, res: Response) =>
    ok(
      res,
      await this.service.update(authenticatedUserId(req), Number(req.params.projectId), req.body),
    )

  addMember = async (req: Request, res: Response) =>
    ok(
      res,
      await this.service.addMember(
        authenticatedUserId(req),
        Number(req.params.projectId),
        req.body.email,
      ),
      201,
    )

  removeMember = async (req: Request, res: Response) => {
    await this.service.removeMember(
      authenticatedUserId(req),
      Number(req.params.projectId),
      Number(req.params.userId),
    )
    return ok(res, null)
  }
}

