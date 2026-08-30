import type { ProjectRole } from '../../domain/entities.js'
import { AppError, forbidden, notFound } from '../../errors/app-error.js'
import type {
  ProjectRepository,
  TaskRepository,
  UserRepository,
} from '../../repositories/contracts.js'

export class ProjectService {
  constructor(
    private readonly projects: ProjectRepository,
    private readonly users: UserRepository,
    private readonly tasks: TaskRepository,
  ) {}

  list(userId: number) {
    return this.projects.listForUser(userId)
  }

  async detail(userId: number, projectId: number) {
    await this.requireRole(projectId, userId)
    const project = await this.projects.findById(projectId)
    if (!project) throw notFound('项目')
    return { project, members: await this.projects.listMembers(projectId) }
  }

  create(userId: number, input: { name: string; description: string }) {
    return this.projects.createWithOwner({ ...input, ownerId: userId })
  }

  async update(userId: number, projectId: number, input: { name?: string; description?: string }) {
    await this.requireRole(projectId, userId, 'owner')
    return this.projects.update(projectId, input)
  }

  async addMember(userId: number, projectId: number, email: string) {
    await this.requireRole(projectId, userId, 'owner')
    const member = await this.users.findByEmail(email.toLowerCase())
    if (!member) throw notFound('该邮箱对应的用户')
    await this.projects.addMember(projectId, member.id)
    return this.projects.listMembers(projectId)
  }

  async removeMember(userId: number, projectId: number, memberId: number) {
    await this.requireRole(projectId, userId, 'owner')
    const project = await this.projects.findById(projectId)
    if (!project) throw notFound('项目')
    if (project.ownerId === memberId) {
      throw new AppError(400, 'OWNER_CANNOT_BE_REMOVED', '不能把项目所有者移出项目')
    }
    const assignedTaskCount = await this.tasks.countAssignedInProject(projectId, memberId)
    if (assignedTaskCount > 0) {
      throw new AppError(
        409,
        'MEMBER_HAS_ASSIGNED_TASKS',
        `该成员仍负责 ${assignedTaskCount} 项任务，请先重新分配`,
      )
    }
    await this.projects.removeMember(projectId, memberId)
  }

  /**
   * Policy（权限策略）集中在这里，其他 Service 也能复用。
   * requiredRole 为空代表“任意项目成员”，为 owner 则要求所有者身份。
   */
  async requireRole(projectId: number, userId: number, requiredRole?: ProjectRole) {
    const project = await this.projects.findById(projectId)
    if (!project) throw notFound('项目')
    const role = await this.projects.memberRole(projectId, userId)
    if (!role) throw forbidden('你不是该项目的成员')
    if (requiredRole && role !== requiredRole) throw forbidden('只有项目所有者能执行此操作')
    return role
  }
}
