import type { NextFunction, Request, Response } from 'express'
import { z } from 'zod'
import { AppError } from '../errors/app-error.js'

type RequestSchemas = {
  body?: z.ZodType
  params?: z.ZodType
  query?: z.ZodType
}

/**
 * 一个通用校验中间件。校验通过后把解析结果写回 req。
 * z.coerce.number() 等转换因此对 Controller 可见，例如路径参数 "12" 会变成数字 12。
 */
export function validate(schemas: RequestSchemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body)
      if (schemas.params) req.params = schemas.params.parse(req.params) as Request['params']
      // Express 5 的 req.query 是 getter，不能直接赋值；解析后的 query 放到 res.locals。
      const parsedQuery = schemas.query ? schemas.query.parse(req.query) : undefined
      if (parsedQuery) _res.locals.validatedQuery = parsedQuery
      next()
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(
          new AppError(422, 'VALIDATION_ERROR', '请求参数不符合要求', z.flattenError(error)),
        )
        return
      }
      next(error)
    }
  }
}

