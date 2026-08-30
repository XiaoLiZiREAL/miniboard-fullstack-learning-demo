declare global {
  namespace Express {
    interface Request {
      /** authenticate 中间件验证 JWT 后写入，后续 Controller 不再解析 Token。 */
      userId?: number
    }
  }
}

export {}

