import { defineStore } from 'pinia'
import { authApi } from '@/api'
import { readToken, saveToken } from '@/api/client'
import type { User } from '@/types/domain'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: readToken() as string | null,
    user: null as User | null,
    initialized: false,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.token),
  },
  actions: {
    async login(input: { email: string; password: string }) {
      const result = await authApi.login(input)
      this.token = result.token
      this.user = result.user
      // 教学 Demo 使用 sessionStorage，关闭标签页后失效。
      // 生产项目更常见的方案是短期 Access Token + HttpOnly Refresh Cookie。
      saveToken(result.token)
    },
    async register(input: { name: string; email: string; password: string }) {
      const result = await authApi.register(input)
      this.token = result.token
      this.user = result.user
      saveToken(result.token)
    },
    async initialize() {
      if (this.token) {
        try {
          this.user = await authApi.me()
        } catch {
          this.logout()
        }
      }
      this.initialized = true
    },
    logout() {
      this.token = null
      this.user = null
      saveToken(null)
    },
  },
})

