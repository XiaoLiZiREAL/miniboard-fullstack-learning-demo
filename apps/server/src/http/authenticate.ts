import type { NextFunction, Request, Response } from 'express'
import { AppError } from '../errors/app-error.js'
import { TokenService } from '../security/token.js'

export function createAuthenticate(tokens: TokenService) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const [scheme, token] = req.header('authorization')?.split(' ') ?? []
      if (scheme !== 'Bearer' || !token) {
        throw new AppError(401, 'AUTH_REQUIRED', '请先登录')
      }
      req.userId = await tokens.verify(token)
      next()
    } catch (error) {
      next(error)
    }
  }
}

/** 受保护路由经过 authenticate 后 userId 必然存在；缺失代表开发阶段的路由装配错误。 */
export function authenticatedUserId(req: Request) {
  if (!req.userId) throw new AppError(401, 'AUTH_REQUIRED', '请先登录')
  return req.userId
}

