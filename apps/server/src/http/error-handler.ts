import type { ErrorRequestHandler, RequestHandler } from 'express'
import { AppError } from '../errors/app-error.js'

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(404, 'ROUTE_NOT_FOUND', `接口 ${req.method} ${req.path} 不存在`))
}

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  // MySQL 唯一索引竞争导致的重复邮箱，在这里转换成稳定业务错误。
  const mysqlError = error as { code?: string }
  const httpError = error as { type?: string; status?: number }
  const normalized =
    httpError.type === 'entity.parse.failed'
      ? new AppError(400, 'INVALID_JSON', '请求体不是有效的 JSON')
      : httpError.type === 'entity.too.large'
        ? new AppError(413, 'PAYLOAD_TOO_LARGE', '请求体超过允许大小')
        : mysqlError.code === 'ER_DUP_ENTRY'
          ? new AppError(409, 'DUPLICATE_RESOURCE', '数据已存在，请勿重复提交')
          : error

  if (normalized instanceof AppError) {
    res.status(normalized.status).json({
      success: false,
      error: {
        code: normalized.code,
        message: normalized.message,
        ...(normalized.details === undefined ? {} : { details: normalized.details }),
      },
    })
    return
  }

  req.log?.error({ err: normalized }, 'Unhandled request error')
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: '服务器发生了未预期的错误',
    },
  })
}
