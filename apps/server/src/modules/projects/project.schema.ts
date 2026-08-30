import { z } from 'zod'

export const projectIdParams = z.object({
  projectId: z.coerce.number().int().positive(),
})

export const memberParams = projectIdParams.extend({
  userId: z.coerce.number().int().positive(),
})

export const createProjectBody = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(1000).default(''),
})

export const updateProjectBody = createProjectBody.partial().refine(
  (input) => Object.keys(input).length > 0,
  '至少提供一个需要修改的字段',
)

export const addMemberBody = z.object({ email: z.email().transform((email) => email.toLowerCase()) })

