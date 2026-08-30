export type ProjectRole = 'owner' | 'member'
export type TaskStatus = 'todo' | 'doing' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'

export interface User {
  id: number
  name: string
  email: string
  createdAt: string
}

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

export interface ProjectMember {
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

