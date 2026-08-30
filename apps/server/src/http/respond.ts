import type { Response } from 'express'

/** 统一成功响应形状，前端的 API 客户端只需要处理一种协议。 */
export function ok<T>(res: Response, data: T, status = 200) {
  return res.status(status).json({ success: true, data })
}

