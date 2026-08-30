/**
 * 领域实体描述业务中的核心名词，不依赖 Express，也不依赖 MySQL。
 * 日期统一使用 ISO 字符串，API、内存仓库和 MySQL 仓库因此拥有同一种输出形状。
 */
export type ProjectRole = 'owner' | 'member'
export type TaskStatus = 'todo' | 'doing' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'

export interface User {
  id: number
  name: string
  email: string
  passwordHash: string
  createdAt: string
}

export type PublicUser = Omit<User, 'passwordHash'>

export interface Project {
  id: number
  name: string
  description: string
  ownerId: number
  createdAt: string
  updatedAt: string
}

export interface ProjectSummary extends Project {
  role: ProjectRole
  taskCount: number
  completedTaskCount: number
}

export interface ProjectMemberView {
  userId: number
  name: string
  email: string
  role: ProjectRole
  joinedAt: string
}

export interface Task {
  id: number
  projectId: number
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  assigneeId: number | null
  creatorId: number
  dueDate: string | null
  createdAt: string
  updatedAt: string
}

export interface TaskComment {
  id: number
  taskId: number
  authorId: number
  authorName: string
  content: string
  createdAt: string
}

export function toPublicUser(user: User): PublicUser {
  // 永远不要把 passwordHash 返回给前端，即使它已经不是明文密码。
  const { passwordHash: _passwordHash, ...publicUser } = user
  return publicUser
}

