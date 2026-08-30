import type { AppConfig } from './config/env.js'
import { hashPassword } from './security/password.js'
import { TokenService } from './security/token.js'
import type { RepositoryBundle } from './repositories/contracts.js'
import { createMemoryRepositories } from './repositories/memory/memory-repositories.js'
import { createMysqlRepositories } from './repositories/mysql/mysql-repositories.js'
import { AuthService } from './modules/auth/auth.service.js'
import { ProjectService } from './modules/projects/project.service.js'
import { TaskService } from './modules/tasks/task.service.js'
import { CommentService } from './modules/comments/comment.service.js'

export interface ApplicationContainer {
  repositories: RepositoryBundle
  tokens: TokenService
  authService: AuthService
  projectService: ProjectService
  taskService: TaskService
  commentService: CommentService
}

export async function createContainer(config: AppConfig): Promise<ApplicationContainer> {
  // 这行就是“基础设施切换点”：Service 并不知道下面究竟是数组还是 MySQL。
  const repositories =
    config.databaseDriver === 'mysql'
      ? createMysqlRepositories(config.mysql)
      : createMemoryRepositories()

  const tokens = new TokenService(config.jwtSecret)
  const authService = new AuthService(repositories.users, tokens)
  const projectService = new ProjectService(
    repositories.projects,
    repositories.users,
    repositories.tasks,
  )
  const taskService = new TaskService(repositories.tasks, repositories.projects, projectService)
  const commentService = new CommentService(repositories.comments, repositories.tasks, projectService)

  const container = {
    repositories,
    tokens,
    authService,
    projectService,
    taskService,
    commentService,
  }

  if (config.databaseDriver === 'memory' && config.seedDemoData) {
    await seedMemoryDemo(container)
  }
  return container
}

async function seedMemoryDemo(container: ApplicationContainer) {
  if (await container.repositories.users.findByEmail('student@example.com')) return

  const student = await container.repositories.users.create({
    name: '全栈学习者',
    email: 'student@example.com',
    passwordHash: await hashPassword('Fullstack123!'),
  })
  const teammate = await container.repositories.users.create({
    name: '设计搭档',
    email: 'designer@example.com',
    passwordHash: await hashPassword('Fullstack123!'),
  })
  const project = await container.repositories.projects.createWithOwner({
    name: 'MiniBoard 学习项目',
    description: '从一个真实任务板理解 Express、分层架构、REST API 与数据库。',
    ownerId: student.id,
  })
  await container.repositories.projects.addMember(project.id, teammate.id)

  const todo = await container.repositories.tasks.create({
    projectId: project.id,
    title: '阅读请求链路说明',
    description: '从 Route 出发，一路跟踪 Controller、Service、Repository。',
    status: 'todo',
    priority: 'high',
    assigneeId: student.id,
    creatorId: student.id,
    dueDate: null,
  })
  await container.repositories.tasks.create({
    projectId: project.id,
    title: '调用第一个受保护 API',
    description: '观察 Authorization 请求头和 authenticate 中间件。',
    status: 'doing',
    priority: 'medium',
    assigneeId: teammate.id,
    creatorId: student.id,
    dueDate: null,
  })
  await container.repositories.tasks.create({
    projectId: project.id,
    title: '启动 Vue 前端',
    description: '理解 Vite 代理如何把 /api 请求转发给 Express。',
    status: 'done',
    priority: 'low',
    assigneeId: student.id,
    creatorId: student.id,
    dueDate: null,
  })
  await container.repositories.comments.create({
    taskId: todo.id,
    authorId: teammate.id,
    content: '建议在浏览器 Network 面板里一起观察请求和响应。',
  })
}
