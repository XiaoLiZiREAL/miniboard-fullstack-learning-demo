import { Router, type RequestHandler } from 'express'
import { validate } from '../../http/validate.js'
import { AuthController } from './auth.controller.js'
import { loginBody, registerBody } from './auth.schema.js'

export function createAuthRouter(controller: AuthController, authenticate: RequestHandler) {
  const router = Router()
  router.post('/register', validate({ body: registerBody }), controller.register)
  router.post('/login', validate({ body: loginBody }), controller.login)
  router.get('/me', authenticate, controller.me)
  return router
}

