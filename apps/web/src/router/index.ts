import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// 页面级动态导入会让 Vite 按路由拆包：登录页无需提前下载整个看板代码。
const AppLayout = () => import('@/layouts/AppLayout.vue')
const AuthView = () => import('@/views/AuthView.vue')
const LearningView = () => import('@/views/LearningView.vue')
const ProjectBoardView = () => import('@/views/ProjectBoardView.vue')
const ProjectsView = () => import('@/views/ProjectsView.vue')

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: AuthView, meta: { guestOnly: true } },
    {
      path: '/',
      component: AppLayout,
      meta: { requiresAuth: true },
      children: [
        { path: '', redirect: '/projects' },
        { path: 'projects', name: 'projects', component: ProjectsView },
        { path: 'projects/:projectId', name: 'project-board', component: ProjectBoardView },
        { path: 'learn', name: 'learn', component: LearningView },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/projects' },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (!auth.initialized) await auth.initialize()
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.guestOnly && auth.isAuthenticated) return { name: 'projects' }
  return true
})
