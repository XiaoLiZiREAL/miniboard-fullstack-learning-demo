import type { Request, Response } from 'express'
import { authenticatedUserId } from '../../http/authenticate.js'
import { ok } from '../../http/respond.js'
import { AuthService } from './auth.service.js'

export class AuthController {
  constructor(private readonly service: AuthService) {}

  register = async (req: Request, res: Response) => {
    return ok(res, await this.service.register(req.body), 201)
  }

  login = async (req: Request, res: Response) => {
    return ok(res, await this.service.login(req.body))
  }

  me = async (req: Request, res: Response) => {
    return ok(res, await this.service.currentUser(authenticatedUserId(req)))
  }
}

