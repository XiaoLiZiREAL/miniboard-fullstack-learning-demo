import { z } from 'zod'

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD')
  .nullable()

export const projectTaskParams = z.object({
  projectId: z.coerce.number().int().positive(),
})

export const taskIdParams = z.object({
  taskId: z.coerce.number().int().positive(),
})

export const createTaskBody = z.object({
  title: z.string().trim().min(1, '任务标题不能为空').max(100),
  description: z.string().trim().max(2000).default(''),
  status: z.enum(['todo', 'doing', 'done']).default('todo'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  assigneeId: z.number().int().positive().nullable().default(null),
  dueDate: dateOnly.default(null),
})

export const updateTaskBody = createTaskBody.partial().refine(
  (input) => Object.keys(input).length > 0,
  '至少提供一个需要修改的字段',
)

export const taskQuery = z.object({
  status: z.enum(['todo', 'doing', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  keyword: z.string().trim().max(100).optional(),
})

