import { forbidden, notFound } from '../../errors/app-error.js'
import type { CommentRepository, TaskRepository } from '../../repositories/contracts.js'
import { ProjectService } from '../projects/project.service.js'

export class CommentService {
  constructor(
    private readonly comments: CommentRepository,
    private readonly tasks: TaskRepository,
    private readonly projectService: ProjectService,
  ) {}

  async list(userId: number, taskId: number) {
    const task = await this.requireTask(taskId)
    await this.projectService.requireRole(task.projectId, userId)
    return this.comments.listByTask(taskId)
  }

  async create(userId: number, taskId: number, content: string) {
    const task = await this.requireTask(taskId)
    await this.projectService.requireRole(task.projectId, userId)
    return this.comments.create({ taskId, authorId: userId, content })
  }

  async delete(userId: number, commentId: number) {
    const comment = await this.comments.findById(commentId)
    if (!comment) throw notFound('评论')
    const task = await this.requireTask(comment.taskId)
    const role = await this.projectService.requireRole(task.projectId, userId)
    if (role !== 'owner' && comment.authorId !== userId) {
      throw forbidden('只有项目所有者或评论作者能删除评论')
    }
    await this.comments.delete(commentId)
  }

  private async requireTask(taskId: number) {
    const task = await this.tasks.findById(taskId)
    if (!task) throw notFound('任务')
    return task
  }
}

