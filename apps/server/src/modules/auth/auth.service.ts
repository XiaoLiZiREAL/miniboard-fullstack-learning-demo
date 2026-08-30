import { AppError, notFound } from '../../errors/app-error.js'
import type { UserRepository } from '../../repositories/contracts.js'
import { hashPassword, verifyPassword } from '../../security/password.js'
import { TokenService } from '../../security/token.js'
import { toPublicUser } from '../../domain/entities.js'

export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly tokens: TokenService,
  ) {}

  async register(input: { name: string; email: string; password: string }) {
    const email = input.email.toLowerCase()
    if (await this.users.findByEmail(email)) {
      throw new AppError(409, 'EMAIL_EXISTS', '该邮箱已经注册')
    }

    const passwordHash = await hashPassword(input.password)
    const user = await this.users.create({ name: input.name, email, passwordHash })
    return { user: toPublicUser(user), token: await this.tokens.sign(user) }
  }

  async login(input: { email: string; password: string }) {
    const user = await this.users.findByEmail(input.email.toLowerCase())
    // 邮箱不存在和密码不正确返回相同信息，避免泄漏某个邮箱是否注册。
    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      throw new AppError(401, 'INVALID_CREDENTIALS', '邮箱或密码不正确')
    }
    return { user: toPublicUser(user), token: await this.tokens.sign(user) }
  }

  async currentUser(userId: number) {
    const user = await this.users.findById(userId)
    if (!user) throw notFound('用户')
    return toPublicUser(user)
  }
}

