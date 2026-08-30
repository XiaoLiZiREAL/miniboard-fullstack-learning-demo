import { loadConfig } from '../../config/env.js'
import { loadOptionalEnvFile } from '../../config/load-env.js'
import { hashPassword } from '../../security/password.js'
import { createMysqlRepositories } from '../../repositories/mysql/mysql-repositories.js'

loadOptionalEnvFile()
const config = loadConfig()
const repositories = createMysqlRepositories(config.mysql)

try {
  let student = await repositories.users.findByEmail('student@example.com')
  if (!student) {
    student = await repositories.users.create({
      name: '全栈学习者',
      email: 'student@example.com',
      passwordHash: await hashPassword('Fullstack123!'),
    })
  }

  const exists = (await repositories.projects.listForUser(student.id)).some(
    (project) => project.name === 'MiniBoard 学习项目',
  )
  if (!exists) {
    const project = await repositories.projects.createWithOwner({
      name: 'MiniBoard 学习项目',
      description: 'MySQL 持久化版本的示例项目。',
      ownerId: student.id,
    })
    await repositories.tasks.create({
      projectId: project.id,
      title: '查看 MySQL 中的真实数据',
      description: '尝试 SELECT、JOIN，并和 Repository 里的 SQL 对照。',
      status: 'todo',
      priority: 'high',
      assigneeId: student.id,
      creatorId: student.id,
      dueDate: null,
    })
  }
  console.log('Demo data seeded. Login: student@example.com / Fullstack123!')
} finally {
  await repositories.close()
}

