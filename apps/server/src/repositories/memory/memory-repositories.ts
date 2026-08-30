import type {
  Project,
  ProjectMemberView,
  ProjectRole,
  ProjectSummary,
  Task,
  TaskComment,
  User,
} from '../../domain/entities.js'
import type {
  CommentRepository,
  ProjectRepository,
  RepositoryBundle,
  TaskFilters,
  TaskRepository,
  UserRepository,
} from '../contracts.js'

interface ProjectMemberRecord {
  projectId: number
  userId: number
  role: ProjectRole
  joinedAt: string
}

/**
 * 内存数据库让项目在没有 MySQL 时仍然完整可运行。
 * 它不是把数据偷偷存进 localStorage，而是后端进程中的临时数据：服务器重启后会重置。
 * Repository 接口让它与 MySQL 版本拥有完全一致的业务能力。
 */
class MemoryDatabase {
  users: User[] = []
  projects: Project[] = []
  members: ProjectMemberRecord[] = []
  tasks: Task[] = []
  comments: TaskComment[] = []

  private ids = { user: 1, project: 1, task: 1, comment: 1 }

  nextId(entity: keyof MemoryDatabase['ids']) {
    const id = this.ids[entity]
    this.ids[entity] += 1
    return id
  }
}

function now() {
  return new Date().toISOString()
}

class MemoryUserRepository implements UserRepository {
  constructor(private readonly db: MemoryDatabase) {}

  async findById(id: number) {
    return this.db.users.find((user) => user.id === id) ?? null
  }

  async findByEmail(email: string) {
    return this.db.users.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null
  }

  async create(input: { name: string; email: string; passwordHash: string }) {
    const user: User = {
      id: this.db.nextId('user'),
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      createdAt: now(),
    }
    this.db.users.push(user)
    return user
  }
}

class MemoryProjectRepository implements ProjectRepository {
  constructor(private readonly db: MemoryDatabase) {}

  async listForUser(userId: number): Promise<ProjectSummary[]> {
    const memberships = this.db.members.filter((member) => member.userId === userId)

    return memberships.flatMap((membership) => {
      const project = this.db.projects.find((item) => item.id === membership.projectId)
      if (!project) return []
      const tasks = this.db.tasks.filter((task) => task.projectId === project.id)
      return [
        {
          ...project,
          role: membership.role,
          taskCount: tasks.length,
          completedTaskCount: tasks.filter((task) => task.status === 'done').length,
        },
      ]
    })
  }

  async findById(id: number) {
    return this.db.projects.find((project) => project.id === id) ?? null
  }

  async createWithOwner(input: { name: string; description: string; ownerId: number }) {
    const timestamp = now()
    const project: Project = {
      id: this.db.nextId('project'),
      name: input.name,
      description: input.description,
      ownerId: input.ownerId,
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    // MySQL 版本使用事务保证这两次写入要么全部成功、要么全部失败。
    // JavaScript 内存写入不会发生数据库连接中断，因此这里直接依次添加。
    this.db.projects.push(project)
    this.db.members.push({
      projectId: project.id,
      userId: input.ownerId,
      role: 'owner',
      joinedAt: timestamp,
    })
    return project
  }

  async update(id: number, input: { name?: string; description?: string }) {
    const project = this.db.projects.find((item) => item.id === id)
    if (!project) throw new Error('Repository invariant: project not found')
    if (input.name !== undefined) project.name = input.name
    if (input.description !== undefined) project.description = input.description
    project.updatedAt = now()
    return { ...project }
  }

  async memberRole(projectId: number, userId: number) {
    return (
      this.db.members.find(
        (member) => member.projectId === projectId && member.userId === userId,
      )?.role ?? null
    )
  }

  async listMembers(projectId: number): Promise<ProjectMemberView[]> {
    return this.db.members
      .filter((member) => member.projectId === projectId)
      .flatMap((member) => {
        const user = this.db.users.find((item) => item.id === member.userId)
        return user
          ? [
              {
                userId: user.id,
                name: user.name,
                email: user.email,
                role: member.role,
                joinedAt: member.joinedAt,
              },
            ]
          : []
      })
  }

  async addMember(projectId: number, userId: number) {
    const exists = this.db.members.some(
      (member) => member.projectId === projectId && member.userId === userId,
    )
    if (!exists) {
      this.db.members.push({ projectId, userId, role: 'member', joinedAt: now() })
    }
  }

  async removeMember(projectId: number, userId: number) {
    this.db.members = this.db.members.filter(
      (member) => !(member.projectId === projectId && member.userId === userId),
    )
  }
}

class MemoryTaskRepository implements TaskRepository {
  constructor(private readonly db: MemoryDatabase) {}

  async listByProject(projectId: number, filters: TaskFilters) {
    const keyword = filters.keyword?.trim().toLowerCase()
    return this.db.tasks
      .filter((task) => task.projectId === projectId)
      .filter((task) => !filters.status || task.status === filters.status)
      .filter((task) => !filters.priority || task.priority === filters.priority)
      .filter(
        (task) =>
          !keyword ||
          task.title.toLowerCase().includes(keyword) ||
          task.description.toLowerCase().includes(keyword),
      )
      .map((task) => ({ ...task }))
  }

  async countAssignedInProject(projectId: number, userId: number) {
    return this.db.tasks.filter(
      (task) => task.projectId === projectId && task.assigneeId === userId,
    ).length
  }

  async findById(id: number) {
    const task = this.db.tasks.find((item) => item.id === id)
    return task ? { ...task } : null
  }

  async create(input: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) {
    const timestamp = now()
    const task: Task = {
      id: this.db.nextId('task'),
      ...input,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    this.db.tasks.push(task)
    return { ...task }
  }

  async update(
    id: number,
    input: Partial<
      Pick<Task, 'title' | 'description' | 'status' | 'priority' | 'assigneeId' | 'dueDate'>
    >,
  ) {
    const task = this.db.tasks.find((item) => item.id === id)
    if (!task) throw new Error('Repository invariant: task not found')
    Object.assign(task, input, { updatedAt: now() })
    return { ...task }
  }

  async delete(id: number) {
    this.db.tasks = this.db.tasks.filter((task) => task.id !== id)
    // 数据库中的 comments 外键配置了 ON DELETE CASCADE，这里手动模拟级联删除。
    this.db.comments = this.db.comments.filter((comment) => comment.taskId !== id)
  }
}

class MemoryCommentRepository implements CommentRepository {
  constructor(private readonly db: MemoryDatabase) {}

  async listByTask(taskId: number) {
    return this.db.comments.filter((comment) => comment.taskId === taskId).map((item) => ({ ...item }))
  }

  async findById(id: number) {
    const comment = this.db.comments.find((item) => item.id === id)
    return comment ? { ...comment } : null
  }

  async create(input: { taskId: number; authorId: number; content: string }) {
    const author = this.db.users.find((user) => user.id === input.authorId)
    if (!author) throw new Error('Repository invariant: comment author not found')
    const comment: TaskComment = {
      id: this.db.nextId('comment'),
      taskId: input.taskId,
      authorId: input.authorId,
      authorName: author.name,
      content: input.content,
      createdAt: now(),
    }
    this.db.comments.push(comment)
    return { ...comment }
  }

  async delete(id: number) {
    this.db.comments = this.db.comments.filter((comment) => comment.id !== id)
  }
}

export function createMemoryRepositories(): RepositoryBundle {
  const database = new MemoryDatabase()
  return {
    users: new MemoryUserRepository(database),
    projects: new MemoryProjectRepository(database),
    tasks: new MemoryTaskRepository(database),
    comments: new MemoryCommentRepository(database),
    async close() {
      // 内存模式没有网络连接需要释放，但保留统一方法可简化应用关闭逻辑。
    },
  }
}
