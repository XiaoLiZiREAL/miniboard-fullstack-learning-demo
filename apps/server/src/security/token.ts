import { SignJWT, jwtVerify } from 'jose'
import { AppError } from '../errors/app-error.js'

const ISSUER = 'miniboard-api'
const AUDIENCE = 'miniboard-web'

export class TokenService {
  private readonly key: Uint8Array

  constructor(secret: string) {
    this.key = new TextEncoder().encode(secret)
  }

  async sign(user: { id: number; email: string; name: string }) {
    return new SignJWT({ email: user.email, name: user.name })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(String(user.id))
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setIssuedAt()
      .setExpirationTime('2h')
      .sign(this.key)
  }

  async verify(token: string) {
    try {
      // jwtVerify 会同时验证签名、有效期、issuer 和 audience，不是简单 decode。
      const { payload } = await jwtVerify(token, this.key, {
        issuer: ISSUER,
        audience: AUDIENCE,
        algorithms: ['HS256'],
      })
      const userId = Number(payload.sub)
      if (!Number.isInteger(userId) || userId <= 0) throw new Error('Invalid subject')
      return userId
    } catch {
      throw new AppError(401, 'INVALID_TOKEN', '登录凭证无效或已过期，请重新登录')
    }
  }
}

