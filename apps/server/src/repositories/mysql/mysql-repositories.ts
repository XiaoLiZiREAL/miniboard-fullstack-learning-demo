import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import type { AppConfig } from '../../config/env.js'
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
} from '../../domain/entities.js'
import { createMysqlPool } from '../../database/mysql/pool.js'
import type {
  CommentRepository,
  ProjectRepository,
  RepositoryBundle,
  TaskFilters,
  TaskRepository,
  UserRepository,
} from '../contracts.js'

interface UserRow extends RowDataPacket {
  id: number
  name: string
  email: string
  passwordHash: string
  createdAt: string
}

interface ProjectRow extends RowDataPacket {
  id: number
  name: string
  description: string
  ownerId: number
  createdAt: string
  updatedAt: string
}

interface ProjectSummaryRow extends ProjectRow {
  role: ProjectRole
  taskCount: number
  completedTaskCount: number
}

interface MemberRow extends RowDataPacket {
  userId: number
  name: string
  email: string
  role: ProjectRole
  joinedAt: string
}

interface RoleRow extends RowDataPacket {
  role: ProjectRole
}

interface TaskRow extends RowDataPacket {
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

interface CommentRow extends RowDataPacket {
  id: number
  taskId: number
  authorId: number
  authorName: string
  content: string
  createdAt: string
}

interface CountRow extends RowDataPacket {
  count: number
}

function dateTimeToIso(value: string) {
  // mysql2 的 dateStrings 会返回 "YYYY-MM-DD HH:mm:ss.SSS"；API 统一输出 ISO 8601。
  return value.includes('T') ? value : `${value.replace(' ', 'T')}Z`
}

function mapUser(row: UserRow): User {
  return { ...row, id: Number(row.id), createdAt: dateTimeToIso(row.createdAt) }
}

function mapProject(row: ProjectRow): Project {
  return {
    ...row,
    id: Number(row.id),
    ownerId: Number(row.ownerId),
    createdAt: dateTimeToIso(row.createdAt),
    updatedAt: dateTimeToIso(row.updatedAt),
  }
}

function mapTask(row: TaskRow): Task {
  return {
    ...row,
    id: Number(row.id),
    projectId: Number(row.projectId),
    assigneeId: row.assigneeId === null ? null : Number(row.assigneeId),
    creatorId: Number(row.creatorId),
    createdAt: dateTimeToIso(row.createdAt),
    updatedAt: dateTimeToIso(row.updatedAt),
  }
}

class MysqlUserRepository implements UserRepository {
  constructor(private readonly pool: Pool) {}

  private readonly selectColumns = `
    id, name, email, password_hash AS passwordHash, created_at AS createdAt
  `

  async findById(id: number) {
    const [rows] = await this.pool.execute<UserRow[]>(
      `SELECT ${this.selectColumns} FROM users WHERE id = ? LIMIT 1`,
      [id],
    )
    return rows[0] ? mapUser(rows[0]) : null
  }

  async findByEmail(email: string) {
    const [rows] = await this.pool.execute<UserRow[]>(
      `SELECT ${this.selectColumns} FROM users WHERE email = ? LIMIT 1`,
      [email.toLowerCase()],
    )
    return rows[0] ? mapUser(rows[0]) : null
  }

  async create(input: { name: string; email: string; passwordHash: string }) {
    const [result] = await this.pool.execute<ResultSetHeader>(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [input.name, input.email.toLowerCase(), input.passwordHash],
    )
    const user = await this.findById(result.insertId)
    if (!user) throw new Error('Repository invariant: inserted user not found')
    return user
  }
}

class MysqlProjectRepository implements ProjectRepository {
  constructor(private readonly pool: Pool) {}

  private readonly selectColumns = `
    p.id, p.name, p.description, p.owner_id AS ownerId,
    p.created_at AS createdAt, p.updated_at AS updatedAt
  `

  async listForUser(userId: number): Promise<ProjectSummary[]> {
    const [rows] = await this.pool.execute<ProjectSummaryRow[]>(
      `SELECT ${this.selectColumns}, pm.role,
              COUNT(t.id) AS taskCount,
              COALESCE(SUM(t.status = 'done'), 0) AS completedTaskCount
       FROM projects p
       INNER JOIN project_members pm ON pm.project_id = p.id
       LEFT JOIN tasks t ON t.project_id = p.id
       WHERE pm.user_id = ?
       GROUP BY p.id, p.name, p.description, p.owner_id, p.created_at, p.updated_at, pm.role
       ORDER BY p.updated_at DESC`,
      [userId],
    )
    return rows.map((row) => ({
      ...mapProject(row),
      role: row.role,
      taskCount: Number(row.taskCount),
      completedTaskCount: Number(row.completedTaskCount),
    }))
  }

  async findById(id: number) {
    const [rows] = await this.pool.execute<ProjectRow[]>(
      `SELECT ${this.selectColumns} FROM projects p WHERE p.id = ? LIMIT 1`,
      [id],
    )
    return rows[0] ? mapProject(rows[0]) : null
  }

  async createWithOwner(input: { name: string; description: string; ownerId: number }) {
    const connection = await this.pool.getConnection()
    try {
      await connection.beginTransaction()
      const [result] = await connection.execute<ResultSetHeader>(
        'INSERT INTO projects (name, description, owner_id) VALUES (?, ?, ?)',
        [input.name, input.description, input.ownerId],
      )
      await connection.execute(
        "INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, 'owner')",
        [result.insertId, input.ownerId],
      )
      await connection.commit()
      const project = await this.findById(result.insertId)
      if (!project) throw new Error('Repository invariant: inserted project not found')
      return project
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      // 连接池中的连接必须归还，否则请求增多后连接会被耗尽。
      connection.release()
    }
  }

  async update(id: number, input: { name?: string; description?: string }) {
    const fields: string[] = []
    const values: Array<string | number | null> = []
    if (input.name !== undefined) {
      fields.push('name = ?')
      values.push(input.name)
    }
    if (input.description !== undefined) {
      fields.push('description = ?')
      values.push(input.description)
    }
    if (fields.length > 0) {
      fields.push('updated_at = CURRENT_TIMESTAMP(3)')
      values.push(id)
      await this.pool.execute(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`, values)
    }
    const project = await this.findById(id)
    if (!project) throw new Error('Repository invariant: project not found after update')
    return project
  }

  async memberRole(projectId: number, userId: number) {
    const [rows] = await this.pool.execute<RoleRow[]>(
      'SELECT role FROM project_members WHERE project_id = ? AND user_id = ? LIMIT 1',
      [projectId, userId],
    )
    return rows[0]?.role ?? null
  }

  async listMembers(projectId: number): Promise<ProjectMemberView[]> {
    const [rows] = await this.pool.execute<MemberRow[]>(
      `SELECT u.id AS userId, u.name, u.email, pm.role, pm.joined_at AS joinedAt
       FROM project_members pm
       INNER JOIN users u ON u.id = pm.user_id
       WHERE pm.project_id = ?
       ORDER BY FIELD(pm.role, 'owner', 'member'), pm.joined_at`,
      [projectId],
    )
    return rows.map((row) => ({
      ...row,
      userId: Number(row.userId),
      joinedAt: dateTimeToIso(row.joinedAt),
    }))
  }

  async addMember(projectId: number, userId: number) {
    await this.pool.execute(
      "INSERT IGNORE INTO project_members (project_id, user_id, role) VALUES (?, ?, 'member')",
      [projectId, userId],
    )
  }

  async removeMember(projectId: number, userId: number) {
    await this.pool.execute('DELETE FROM project_members WHERE project_id = ? AND user_id = ?', [
      projectId,
      userId,
    ])
  }
}

class MysqlTaskRepository implements TaskRepository {
  constructor(private readonly pool: Pool) {}

  private readonly selectColumns = `
    id, project_id AS projectId, title, description, status, priority,
    assignee_id AS assigneeId, creator_id AS creatorId, due_date AS dueDate,
    created_at AS createdAt, updated_at AS updatedAt
  `

  async listByProject(projectId: number, filters: TaskFilters) {
    const clauses = ['project_id = ?']
    const values: Array<string | number | null> = [projectId]
    if (filters.status) {
      clauses.push('status = ?')
      values.push(filters.status)
    }
    if (filters.priority) {
      clauses.push('priority = ?')
      values.push(filters.priority)
    }
    if (filters.keyword) {
      clauses.push('(title LIKE ? OR description LIKE ?)')
      const pattern = `%${filters.keyword}%`
      values.push(pattern, pattern)
    }
    const [rows] = await this.pool.execute<TaskRow[]>(
      `SELECT ${this.selectColumns} FROM tasks
       WHERE ${clauses.join(' AND ')}
       ORDER BY FIELD(priority, 'high', 'medium', 'low'), created_at DESC`,
      values,
    )
    return rows.map(mapTask)
  }

  async countAssignedInProject(projectId: number, userId: number) {
    const [rows] = await this.pool.execute<CountRow[]>(
      'SELECT COUNT(*) AS count FROM tasks WHERE project_id = ? AND assignee_id = ?',
      [projectId, userId],
    )
    return Number(rows[0]?.count ?? 0)
  }

  async findById(id: number) {
    const [rows] = await this.pool.execute<TaskRow[]>(
      `SELECT ${this.selectColumns} FROM tasks WHERE id = ? LIMIT 1`,
      [id],
    )
    return rows[0] ? mapTask(rows[0]) : null
  }

  async create(input: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) {
    const [result] = await this.pool.execute<ResultSetHeader>(
      `INSERT INTO tasks
       (project_id, title, description, status, priority, assignee_id, creator_id, due_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.projectId,
        input.title,
        input.description,
        input.status,
        input.priority,
        input.assigneeId,
        input.creatorId,
        input.dueDate,
      ],
    )
    const task = await this.findById(result.insertId)
    if (!task) throw new Error('Repository invariant: inserted task not found')
    return task
  }

  async update(
    id: number,
    input: Partial<
      Pick<Task, 'title' | 'description' | 'status' | 'priority' | 'assigneeId' | 'dueDate'>
    >,
  ) {
    const columnByKey = {
      title: 'title',
      description: 'description',
      status: 'status',
      priority: 'priority',
      assigneeId: 'assignee_id',
      dueDate: 'due_date',
    } as const
    const fields: string[] = []
    const values: Array<string | number | null> = []
    for (const key of Object.keys(input) as (keyof typeof columnByKey)[]) {
      if (input[key] !== undefined) {
        fields.push(`${columnByKey[key]} = ?`)
        values.push(input[key])
      }
    }
    if (fields.length > 0) {
      fields.push('updated_at = CURRENT_TIMESTAMP(3)')
      values.push(id)
      await this.pool.execute(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, values)
    }
    const task = await this.findById(id)
    if (!task) throw new Error('Repository invariant: task not found after update')
    return task
  }

  async delete(id: number) {
    await this.pool.execute('DELETE FROM tasks WHERE id = ?', [id])
  }
}

class MysqlCommentRepository implements CommentRepository {
  constructor(private readonly pool: Pool) {}

  private readonly selectSql = `
    SELECT c.id, c.task_id AS taskId, c.author_id AS authorId,
           u.name AS authorName, c.content, c.created_at AS createdAt
    FROM task_comments c
    INNER JOIN users u ON u.id = c.author_id
  `

  async listByTask(taskId: number) {
    const [rows] = await this.pool.execute<CommentRow[]>(
      `${this.selectSql} WHERE c.task_id = ? ORDER BY c.created_at`,
      [taskId],
    )
    return rows.map(this.mapComment)
  }

  async findById(id: number) {
    const [rows] = await this.pool.execute<CommentRow[]>(
      `${this.selectSql} WHERE c.id = ? LIMIT 1`,
      [id],
    )
    return rows[0] ? this.mapComment(rows[0]) : null
  }

  async create(input: { taskId: number; authorId: number; content: string }) {
    const [result] = await this.pool.execute<ResultSetHeader>(
      'INSERT INTO task_comments (task_id, author_id, content) VALUES (?, ?, ?)',
      [input.taskId, input.authorId, input.content],
    )
    const comment = await this.findById(result.insertId)
    if (!comment) throw new Error('Repository invariant: inserted comment not found')
    return comment
  }

  async delete(id: number) {
    await this.pool.execute('DELETE FROM task_comments WHERE id = ?', [id])
  }

  private mapComment(row: CommentRow): TaskComment {
    return {
      ...row,
      id: Number(row.id),
      taskId: Number(row.taskId),
      authorId: Number(row.authorId),
      createdAt: dateTimeToIso(row.createdAt),
    }
  }
}

export function createMysqlRepositories(config: AppConfig['mysql']): RepositoryBundle {
  const pool = createMysqlPool(config)
  return {
    users: new MysqlUserRepository(pool),
    projects: new MysqlProjectRepository(pool),
    tasks: new MysqlTaskRepository(pool),
    comments: new MysqlCommentRepository(pool),
    async close() {
      await pool.end()
    },
  }
}
