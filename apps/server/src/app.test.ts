import type { Express } from 'express'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createApplication } from './app.js'
import { loadConfig, type AppConfig } from './config/env.js'

interface RegisteredUser {
  token: string
  user: { id: number; name: string; email: string }
}

/**
 * 每条测试都创建全新的内存 Repository，测试之间不共享 token、ID 或数据库状态。
 * 这是比“按固定顺序运行测试”更可靠的写法：任何一条测试都能被单独执行。
 */
describe('MiniBoard API', () => {
  let app: Express
  let close: () => Promise<void>

  beforeEach(async () => {
    const config: AppConfig = loadConfig({
      NODE_ENV: 'test',
      DB_DRIVER: 'memory',
      SEED_DEMO_DATA: 'false',
      JWT_SECRET: 'test-secret-must-have-at-least-thirty-two-characters',
    })
    const application = await createApplication(config)
    app = application.app
    close = application.close
  })

  afterEach(async () => close())

  async function register(
    email: string,
    name = 'Full-stack learner',
  ): Promise<RegisteredUser> {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ name, email, password: 'Password123!' })
      .expect(201)
    return response.body.data as RegisteredUser
  }

  async function createProject(token: string, name = 'Learning project') {
    const response = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name, description: 'Integration-test project' })
      .expect(201)
    return response.body.data as { id: number }
  }

  it('公开健康检查包含安全响应头且隐藏 Express 标识', async () => {
    const response = await request(app).get('/api/health').expect(200)

    expect(response.body.data.databaseDriver).toBe('memory')
    expect(response.headers['x-content-type-options']).toBe('nosniff')
    expect(response.headers['x-powered-by']).toBeUndefined()
  })

  it('在 Controller 之前拒绝非法输入、畸形 JSON 与过大请求体', async () => {
    const invalidInput = await request(app)
      .post('/api/auth/register')
      .send({ name: 'A', email: 'not-email', password: '123' })
      .expect(422)
    expect(invalidInput.body.error.code).toBe('VALIDATION_ERROR')

    const malformedJson = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":')
      .expect(400)
    expect(malformedJson.body.error.code).toBe('INVALID_JSON')

    const tooLarge = await request(app)
      .post('/api/projects')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ name: 'Big payload', description: 'x'.repeat(101 * 1024) }))
      .expect(413)
    expect(tooLarge.body.error.code).toBe('PAYLOAD_TOO_LARGE')
  })

  it('区分未登录、无效 token 和重复邮箱', async () => {
    const missingToken = await request(app).get('/api/projects').expect(401)
    expect(missingToken.body.error.code).toBe('AUTH_REQUIRED')

    const invalidToken = await request(app)
      .get('/api/projects')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401)
    expect(invalidToken.body.error.code).toBe('INVALID_TOKEN')

    await register('same@example.com')
    const duplicate = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Another user', email: 'same@example.com', password: 'Password123!' })
      .expect(409)
    expect(duplicate.body.error.code).toBe('EMAIL_EXISTS')
  })

  it('完整验证项目成员权限和任务负责人数据不变量', async () => {
    const owner = await register('owner@example.com', 'Owner')
    const teammate = await register('mate@example.com', 'Teammate')
    const outsider = await register('outside@example.com', 'Outsider')
    const project = await createProject(owner.token)

    await request(app)
      .post(`/api/projects/${project.id}/members`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ email: teammate.user.email })
      .expect(201)

    const createdTask = await request(app)
      .post(`/api/projects/${project.id}/tasks`)
      .set('Authorization', `Bearer ${teammate.token}`)
      .send({ title: 'Learn authorization', assigneeId: teammate.user.id })
      .expect(201)
    const taskId = createdTask.body.data.id as number

    await request(app)
      .get(`/api/projects/${project.id}`)
      .set('Authorization', `Bearer ${outsider.token}`)
      .expect(403)

    const invalidAssignee = await request(app)
      .post(`/api/projects/${project.id}/tasks`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Invalid assignment', assigneeId: outsider.user.id })
      .expect(403)
    expect(invalidAssignee.body.error.message).toContain('项目成员')

    await request(app)
      .delete(`/api/projects/${project.id}/members/${teammate.user.id}`)
      .set('Authorization', `Bearer ${teammate.token}`)
      .expect(403)

    const assignedMember = await request(app)
      .delete(`/api/projects/${project.id}/members/${teammate.user.id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(409)
    expect(assignedMember.body.error.code).toBe('MEMBER_HAS_ASSIGNED_TASKS')

    // 先解除任务分配，才允许移除成员，确保 assigneeId 永远指向当前成员。
    await request(app)
      .patch(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ assigneeId: null })
      .expect(200)

    await request(app)
      .delete(`/api/projects/${project.id}/members/${teammate.user.id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(200)

    await request(app)
      .get(`/api/projects/${project.id}`)
      .set('Authorization', `Bearer ${teammate.token}`)
      .expect(403)
  })

  it('只有所有者能编辑项目，项目所有者不能被移除', async () => {
    const owner = await register('owner@example.com', 'Owner')
    const teammate = await register('mate@example.com', 'Teammate')
    const project = await createProject(owner.token)

    await request(app)
      .post(`/api/projects/${project.id}/members`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ email: teammate.user.email })
      .expect(201)

    await request(app)
      .patch(`/api/projects/${project.id}`)
      .set('Authorization', `Bearer ${teammate.token}`)
      .send({ name: 'Forbidden rename' })
      .expect(403)

    const updated = await request(app)
      .patch(`/api/projects/${project.id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ name: 'Renamed project' })
      .expect(200)
    expect(updated.body.data.name).toBe('Renamed project')

    const removeOwner = await request(app)
      .delete(`/api/projects/${project.id}/members/${owner.user.id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(400)
    expect(removeOwner.body.error.code).toBe('OWNER_CANNOT_BE_REMOVED')
  })

  it('任务筛选和项目统计返回一致结果', async () => {
    const owner = await register('owner@example.com', 'Owner')
    const project = await createProject(owner.token)

    await request(app)
      .post(`/api/projects/${project.id}/tasks`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'High priority API', priority: 'high', status: 'doing' })
      .expect(201)
    await request(app)
      .post(`/api/projects/${project.id}/tasks`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Write Vue page', priority: 'low', status: 'done' })
      .expect(201)

    const filtered = await request(app)
      .get(`/api/projects/${project.id}/tasks?priority=high&keyword=api`)
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(200)
    expect(filtered.body.data).toHaveLength(1)
    expect(filtered.body.data[0].title).toBe('High priority API')

    const projects = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(200)
    expect(projects.body.data[0]).toMatchObject({ taskCount: 2, completedTaskCount: 1 })
  })

  it('评论仅项目成员可见，且只有作者或所有者可以删除', async () => {
    const owner = await register('owner@example.com', 'Owner')
    const teammate = await register('mate@example.com', 'Teammate')
    const outsider = await register('outside@example.com', 'Outsider')
    const project = await createProject(owner.token)

    await request(app)
      .post(`/api/projects/${project.id}/members`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ email: teammate.user.email })
      .expect(201)
    const task = await request(app)
      .post(`/api/projects/${project.id}/tasks`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Discuss API design' })
      .expect(201)

    const ownerComment = await request(app)
      .post(`/api/tasks/${task.body.data.id}/comments`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ content: 'Owner comment' })
      .expect(201)
    const teammateComment = await request(app)
      .post(`/api/tasks/${task.body.data.id}/comments`)
      .set('Authorization', `Bearer ${teammate.token}`)
      .send({ content: 'Teammate comment' })
      .expect(201)

    await request(app)
      .get(`/api/tasks/${task.body.data.id}/comments`)
      .set('Authorization', `Bearer ${outsider.token}`)
      .expect(403)
    await request(app)
      .delete(`/api/comments/${ownerComment.body.data.id}`)
      .set('Authorization', `Bearer ${teammate.token}`)
      .expect(403)
    await request(app)
      .delete(`/api/comments/${teammateComment.body.data.id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(200)

    const remaining = await request(app)
      .get(`/api/tasks/${task.body.data.id}/comments`)
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(200)
    expect(remaining.body.data.map((comment: { content: string }) => comment.content)).toEqual([
      'Owner comment',
    ])
  })
})
