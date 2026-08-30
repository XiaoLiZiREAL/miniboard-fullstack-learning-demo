/**
 * 可预期的业务错误使用 AppError；未知错误交给全局错误处理中间件转换为 500。
 * code 供前端做稳定判断，message 供用户阅读，HTTP status 体现协议语义。
 */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function notFound(resource: string) {
  return new AppError(404, 'NOT_FOUND', `${resource}不存在`)
}

export function forbidden(message = '你没有执行此操作的权限') {
  return new AppError(403, 'FORBIDDEN', message)
}

