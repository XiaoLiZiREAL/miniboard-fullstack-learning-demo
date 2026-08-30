import type { TaskPriority, TaskStatus } from '../../domain/entities.js'
import { forbidden, notFound } from '../../errors/app-error.js'
import type { ProjectRepository, TaskFilters, TaskRepository } from '../../repositories/contracts.js'
import { ProjectService } from '../projects/project.service.js'

export interface TaskInput {
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  assigneeId: number | null
  dueDate: string | null
}

export class TaskService {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly projects: ProjectRepository,
    private readonly projectService: ProjectService,
  ) {}

  async list(userId: number, projectId: number, filters: TaskFilters) {
    await this.projectService.requireRole(projectId, userId)
    return this.tasks.listByProject(projectId, filters)
  }

  async detail(userId: number, taskId: number) {
    const task = await this.requireTask(taskId)
    await this.projectService.requireRole(task.projectId, userId)
    return task
  }

  async create(userId: number, projectId: number, input: TaskInput) {
    await this.projectService.requireRole(projectId, userId)
    await this.requireValidAssignee(projectId, input.assigneeId)
    return this.tasks.create({ ...input, projectId, creatorId: userId })
  }

  async update(userId: number, taskId: number, input: Partial<TaskInput>) {
    const task = await this.requireTask(taskId)
    await this.projectService.requireRole(task.projectId, userId)
    if (input.assigneeId !== undefined) {
      await this.requireValidAssignee(task.projectId, input.assigneeId)
    }
    return this.tasks.update(taskId, input)
  }

  async delete(userId: number, taskId: number) {
    const task = await this.requireTask(taskId)
    const role = await this.projectService.requireRole(task.projectId, userId)
    if (role !== 'owner' && task.creatorId !== userId) {
      throw forbidden('只有项目所有者或任务创建者能删除任务')
    }
    await this.tasks.delete(taskId)
  }

  private async requireTask(taskId: number) {
    const task = await this.tasks.findById(taskId)
    if (!task) throw notFound('任务')
    return task
  }

  private async requireValidAssignee(projectId: number, assigneeId: number | null) {
    if (assigneeId !== null && !(await this.projects.memberRole(projectId, assigneeId))) {
      throw forbidden('任务负责人必须是当前项目成员')
    }
  }
}

