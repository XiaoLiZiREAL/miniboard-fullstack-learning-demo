import type {
  Project,
  ProjectMemberView,
  ProjectRole,
  ProjectSummary,
  Task,
  TaskComment,
  TaskPriority,
  TaskStatus,
  User,
} from '../domain/entities.js'

export interface UserRepository {
  findById(id: number): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  create(input: { name: string; email: string; passwordHash: string }): Promise<User>
}

export interface ProjectRepository {
  listForUser(userId: number): Promise<ProjectSummary[]>
  findById(id: number): Promise<Project | null>
  createWithOwner(input: { name: string; description: string; ownerId: number }): Promise<Project>
  update(id: number, input: { name?: string; description?: string }): Promise<Project>
  memberRole(projectId: number, userId: number): Promise<ProjectRole | null>
  listMembers(projectId: number): Promise<ProjectMemberView[]>
  addMember(projectId: number, userId: number): Promise<void>
  removeMember(projectId: number, userId: number): Promise<void>
}

export interface TaskFilters {
  status?: TaskStatus
  priority?: TaskPriority
  keyword?: string
}

export interface TaskRepository {
  listByProject(projectId: number, filters: TaskFilters): Promise<Task[]>
  countAssignedInProject(projectId: number, userId: number): Promise<number>
  findById(id: number): Promise<Task | null>
  create(input: {
    projectId: number
    title: string
    description: string
    status: TaskStatus
    priority: TaskPriority
    assigneeId: number | null
    creatorId: number
    dueDate: string | null
  }): Promise<Task>
  update(
    id: number,
    input: Partial<
      Pick<Task, 'title' | 'description' | 'status' | 'priority' | 'assigneeId' | 'dueDate'>
    >,
  ): Promise<Task>
  delete(id: number): Promise<void>
}

export interface CommentRepository {
  listByTask(taskId: number): Promise<TaskComment[]>
  findById(id: number): Promise<TaskComment | null>
  create(input: { taskId: number; authorId: number; content: string }): Promise<TaskComment>
  delete(id: number): Promise<void>
}

/**
 * Service 只依赖这些接口，而不依赖某个具体数据库。
 * 因此切换 memory/mysql 时，业务层完全不需要改动，这就是依赖倒置的实际用途。
 */
export interface RepositoryBundle {
  users: UserRepository
  projects: ProjectRepository
  tasks: TaskRepository
  comments: CommentRepository
  close(): Promise<void>
}
