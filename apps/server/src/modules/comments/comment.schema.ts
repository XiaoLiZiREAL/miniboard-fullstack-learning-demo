import { z } from 'zod'

export const taskCommentParams = z.object({
  taskId: z.coerce.number().int().positive(),
})

export const commentIdParams = z.object({
  commentId: z.coerce.number().int().positive(),
})

export const createCommentBody = z.object({
  content: z.string().trim().min(1, '评论内容不能为空').max(1000),
})

