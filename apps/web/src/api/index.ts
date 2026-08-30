import { request } from './client'
import type {
  Project,
  ProjectMember,
  ProjectSummary,
  Task,
  TaskComment,
  TaskPriority,
  TaskStatus,
  User,
} from '@/types/domain'

export const systemApi = {
  health: () =>
    request<{ status: string; databaseDriver: 'memory' | 'mysql'; timestamp: string }>('/health'),
}

export const authApi = {
  login: (input: { email: string; password: string }) =>
    request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  register: (input: { name: string; email: string; password: string }) =>
    request<{ user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  me: () => request<User>('/auth/me'),
}

export const projectApi = {
  list: () => request<ProjectSummary[]>('/projects'),
  detail: (id: number) => request<{ project: Project; members: ProjectMember[] }>(`/projects/${id}`),
  create: (input: { name: string; description: string }) =>
    request<Project>('/projects', { method: 'POST', body: JSON.stringify(input) }),
  update: (projectId: number, input: { name?: string; description?: string }) =>
    request<Project>(`/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  addMember: (projectId: number, email: string) =>
    request<ProjectMember[]>(`/projects/${projectId}/members`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  removeMember: (projectId: number, userId: number) =>
    request<null>(`/projects/${projectId}/members/${userId}`, { method: 'DELETE' }),
}

export interface TaskPayload {
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  assigneeId: number | null
  dueDate: string | null
}

export const taskApi = {
  list: (projectId: number, filters: Partial<Pick<Task, 'status' | 'priority'>> & { keyword?: string }) => {
    const query = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => value && query.set(key, String(value)))
    return request<Task[]>(`/projects/${projectId}/tasks?${query}`)
  },
  create: (projectId: number, input: TaskPayload) =>
    request<Task>(`/projects/${projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  update: (taskId: number, input: Partial<TaskPayload>) =>
    request<Task>(`/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(input) }),
  delete: (taskId: number) => request<null>(`/tasks/${taskId}`, { method: 'DELETE' }),
}

export const commentApi = {
  list: (taskId: number) => request<TaskComment[]>(`/tasks/${taskId}/comments`),
  create: (taskId: number, content: string) =>
    request<TaskComment>(`/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
  delete: (commentId: number) => request<null>(`/comments/${commentId}`, { method: 'DELETE' }),
}
