import { z } from 'zod'

export const registerBody = z.object({
  name: z.string().trim().min(2, '昵称至少 2 个字符').max(50),
  email: z.email('请输入有效邮箱').transform((email) => email.toLowerCase()),
  password: z
    .string()
    .min(8, '密码至少 8 位')
    .max(128)
    .regex(/[A-Za-z]/, '密码至少包含一个字母')
    .regex(/\d/, '密码至少包含一个数字'),
})

export const loginBody = z.object({
  email: z.email('请输入有效邮箱').transform((email) => email.toLowerCase()),
  password: z.string().min(1, '请输入密码'),
})

